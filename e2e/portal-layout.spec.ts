import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { v2 as cloudinary } from "cloudinary";
import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";

// Authenticated checks use only an explicitly selected disposable local database.
const connectionString = process.env.PORTAL_UI_TEST_DATABASE_URL;
test.skip(!connectionString, "Set PORTAL_UI_TEST_DATABASE_URL for authenticated layout checks.");
const password = "Layout-check-password-42";
const username = `layout.${randomUUID().slice(0, 8)}`;
const logoUrl = "https://school-logos.example.test/crest.svg";
let db: PrismaClient;
let schoolId: number;
let emptySessionId: number;
let cloudinaryServer: Server;
const deletedAssets: string[] = [];

test.beforeAll(async ({ baseURL }) => {
  const target = new URL(connectionString!);
  if (!target.pathname.endsWith("_test") || !["localhost", "127.0.0.1"].includes(target.hostname)
    || !baseURL || !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) {
    throw new Error("Layout checks require a local app and a disposable local database ending in _test.");
  }
  // The real SDK sends asset deletion to this local stub, never to production Cloudinary.
  cloudinaryServer = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk.toString();
    deletedAssets.push(body);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ result: "ok" }));
  });
  await new Promise<void>((resolve, reject) => { cloudinaryServer.once("error", reject); cloudinaryServer.listen(55439, "127.0.0.1", resolve); });
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  schoolId = 900_000 + Math.floor(Math.random() * 100_000);
  await db.school.create({ data: { id: schoolId, name: "Standard International School", shortName: username, logoUrl, studentIdPrefix: "UI", studentIdDigits: 3 } });
  await db.portalUser.create({ data: { username, displayName: "Layout Owner", schoolId, role: "OWNER", passwordHash: await hash(password), mustChangePassword: false } });
  const empty = await db.legacySession.create({ data: { schoolId, name: "2024/2025", dateCreated: new Date() } });
  emptySessionId = empty.id;
  const session = await db.legacySession.create({ data: { schoolId, name: "2025/2026", dateCreated: new Date() } });
  const category = await db.legacyClassType.create({ data: { schoolId, name: "Secondary", dateCreated: new Date() } });
  await db.legacyTerm.create({ data: { schoolId, name: "First term" } });
  await db.legacyClass.createMany({ data: Array.from({ length: 42 }, (_, index) => ({ schoolId, sessionId: session.id, classTypeId: category.id, name: `JSS ${Math.floor(index / 3) + 1}${"ABC"[index % 3]}`, dateCreated: new Date() })) });
});

test.afterAll(async () => {
  if (!db) return;
  try {
    await db.portalUser.deleteMany({ where: { schoolId } });
    await db.legacyClass.deleteMany({ where: { schoolId } });
    await db.legacyClassType.deleteMany({ where: { schoolId } });
    await db.legacyTerm.deleteMany({ where: { schoolId } });
    await db.legacySession.deleteMany({ where: { schoolId } });
    await db.school.delete({ where: { id: schoolId } });
  } finally {
    await db.$disconnect();
    if (cloudinaryServer) await new Promise<void>((resolve) => cloudinaryServer.close(() => resolve()));
  }
});

test.beforeEach(async ({ page }) => {
  await page.route("https://school-logos.example.test/**", (route) => route.fulfill({
    contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#19724b"/><text x="40" y="48" text-anchor="middle" font-size="24" fill="white">SIS</text></svg>',
  }));
  await page.route("https://res.cloudinary.com/portal-ui-test/**", (route) => route.fulfill({
    contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#19724b"/></svg>',
  }));
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
});

test("promotion offers higher classes and enrolls repeated students in the same class", async ({ page }) => {
  test.setTimeout(90_000);
  const source = await db.legacyClass.findFirstOrThrow({ where: { schoolId, name: "JSS 1A" } });
  const lower = await db.legacyClass.create({ data: { schoolId, sessionId: source.sessionId, classTypeId: source.classTypeId, name: "BASIC 5", dateCreated: new Date() } });
  const students = await Promise.all(["Repeat Student", "Promoted Student"].map((name) => db.studentProfile.create({
    data: { schoolId, name, enrollments: { create: { schoolId, sessionId: source.sessionId, classId: source.id } } },
  })));
  const targetName = `Promotion ${randomUUID().slice(0, 8)}`;
  try {
    await page.goto("/promotion");
    await page.locator('select[name="sourceSessionId"]').selectOption(String(source.sessionId));
    await page.locator('input[name="targetSessionName"]').fill(targetName);
    await page.getByRole("button", { name: "Create and review students" }).click();
    const sourceClass = page.locator(".wizard-class").filter({ has: page.getByRole("heading", { name: "JSS 1A", exact: true }) });
    const promotion = sourceClass.getByLabel("Promote into");
    await expect(promotion).toBeVisible();
    const options = await promotion.locator("option").allTextContents();
    expect(options).not.toContain("BASIC 5");
    expect(options).not.toContain("JSS 1A");
    expect(options).not.toContain("JSS 1B");
    expect(options).toContain("JSS 2A");
    const target = await db.legacySession.findFirstOrThrow({ where: { schoolId, name: targetName } });
    const nextClass = await db.legacyClass.findFirstOrThrow({ where: { schoolId, sessionId: target.id, name: "JSS 2A" } });
    expect(await promotion.inputValue()).toBe(String(nextClass.id));
    await sourceClass.getByLabel("Outcome for Repeat Student").selectOption("REPEATED");
    await page.getByRole("button", { name: "Confirm session promotion" }).click();
    await expect(page).toHaveURL(new RegExp(`/students\\?session=${target.id}$`));
    await expect(page.getByRole("cell").filter({ hasText: "Repeat Student" })).toBeVisible();
    await expect(page.getByRole("cell").filter({ hasText: "Promoted Student" })).toBeVisible();
    const enrolled = await db.enrollment.findMany({ where: { schoolId, studentId: { in: students.map((student) => student.id) } }, include: { class: true } });
    expect(enrolled.filter((item) => item.sessionId === source.sessionId && item.active)).toHaveLength(2);
    expect(enrolled.find((item) => item.studentId === students[0].id && item.sessionId === target.id)?.class.name).toBe("JSS 1A");
    expect(enrolled.find((item) => item.studentId === students[1].id && item.sessionId === target.id)?.class.name).toBe("JSS 2A");
  } finally {
    await db.enrollment.deleteMany({ where: { schoolId, studentId: { in: students.map((student) => student.id) } } });
    await db.studentProfile.deleteMany({ where: { id: { in: students.map((student) => student.id) } } });
    const target = await db.legacySession.findFirst({ where: { schoolId, name: targetName } });
    if (target) {
      await db.legacyClass.deleteMany({ where: { schoolId, sessionId: target.id } });
      await db.legacySession.delete({ where: { id: target.id } });
    }
    await db.legacyClass.delete({ where: { id: lower.id } });
  }
});

test("owners can upload, replace, and remove a logo without entering a URL", async ({ page }) => {
  test.setTimeout(60_000);
  const image = page.locator(".topbar .school-logo");
  await expect(image).toHaveAttribute("src", logoUrl);
  await expect(image).toHaveJSProperty("naturalWidth", 80);
  await page.goto("/settings");
  await expect(page.locator('input[name="logoUrl"]')).toHaveCount(0);
  const control = page.getByRole("group", { name: "School logo", exact: true });
  const file = control.getByLabel("Choose school logo");
  let uploads = 0;
  let failUpload = false;
  const version = 1700000000;
  await page.route("https://api.cloudinary.com/v1_1/portal-ui-test/image/upload", (route) => {
    if (failUpload) return route.fulfill({ status: 500, body: "Upload unavailable" });
    uploads += 1;
    const body = route.request().postDataBuffer()!.toString();
    expect(body).toContain(`standard-schools/${schoolId}/logos`);
    expect(body).toContain("jpg,jpeg,png,webp");
    const public_id = `standard-schools/${schoolId}/logos/upload-${uploads}`;
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ public_id, version, format: "png", signature: cloudinary.utils.api_sign_request({ public_id, version }, "portal-ui-secret") }) });
  });
  await file.setInputFiles({ name: "bad.txt", mimeType: "text/plain", buffer: Buffer.from("Not an image") });
  await expect(control.getByRole("alert")).toContainText("Choose a JPG, PNG, or WebP image.");
  await file.setInputFiles({ name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
  await expect(control.getByRole("alert")).toContainText("no larger than 5 MB");
  expect(uploads).toBe(0);
  const uploadFile = { name: "school-logo.png", mimeType: "image/png", buffer: await readFile("public/brand/app-icon-64.png") };
  await file.setInputFiles(uploadFile);
  const firstUrl = `https://res.cloudinary.com/portal-ui-test/image/upload/v${version}/standard-schools/${schoolId}/logos/upload-1.png`;
  await expect(image).toHaveAttribute("src", new RegExp(`^${firstUrl.replaceAll(".", "\\.")}`));
  expect((await db.school.findUniqueOrThrow({ where: { id: schoolId } })).logoPublicId).toBe(`standard-schools/${schoolId}/logos/upload-1`);
  await page.getByRole("button", { name: "Save school settings", exact: true }).click();
  await expect(image).toHaveAttribute("src", new RegExp(`^${firstUrl.replaceAll(".", "\\.")}`));
  await page.locator('.sidebar a[href="/dashboard"]').click();
  await expect(image).toHaveAttribute("src", new RegExp(`^${firstUrl.replaceAll(".", "\\.")}`));
  await page.goto("/settings");
  failUpload = true;
  await file.setInputFiles(uploadFile);
  await expect(control.getByRole("alert")).toContainText("The logo upload failed");
  await expect(image).toHaveAttribute("src", new RegExp(`^${firstUrl.replaceAll(".", "\\.")}`));
  failUpload = false;
  await file.setInputFiles(uploadFile);
  await expect(image).toHaveAttribute("src", /upload-2\.png/);
  expect(deletedAssets.some((body) => body.includes("upload-1"))).toBe(true);
  await control.getByRole("button", { name: "Remove logo", exact: true }).click();
  await expect(image).toHaveAttribute("src", "/brand/mark-mono-black.svg");
  expect(deletedAssets.some((body) => body.includes("upload-2"))).toBe(true);
  expect(await db.school.findUniqueOrThrow({ where: { id: schoolId }, select: { logoUrl: true, logoPublicId: true } })).toEqual({ logoUrl: null, logoPublicId: null });
  await db.school.update({ where: { id: schoolId }, data: { logoUrl: "https://school-logos.example.test/broken.svg" } });
  await page.route("https://school-logos.example.test/broken.svg", (route) => route.fulfill({ status: 404, body: "Missing" }));
  await page.goto("/dashboard");
  await expect(image).toHaveAttribute("src", "/brand/mark-mono-black.svg");
});

test("import panels keep the heading above the form and contain long class lists", async ({ page }, testInfo) => {
  await page.goto("/students");
  await page.getByText("Import students", { exact: true }).click();
  const heading = await page.getByRole("heading", { name: "Students", exact: true }).boundingBox();
  const panel = await page.locator("details.panel[open]").boundingBox();
  expect(heading!.y + heading!.height).toBeLessThan(panel!.y);
  await expect(page.getByRole("group", { name: "Available classes (42)" }).getByRole("listitem")).toHaveCount(42);
  expect((await page.locator("#import-session").boundingBox())!.height).toBeLessThan(60);
  expect((await page.locator(".class-list").boundingBox())!.height).toBeLessThanOrEqual(160);
  await page.screenshot({ path: testInfo.outputPath("students-desktop.png"), fullPage: true });
  await page.locator('input[type="file"]').setInputFiles({ name: "students.csv", mimeType: "text/csv", buffer: Buffer.from("First Name,Last Name,Class,Gender,Date of Birth\nAda,Okafor,Unknown class,Female,2014-05-12") });
  await expect(page.locator(".student-import").getByRole("alert")).toContainText("Unknown class");
  await expect(page.getByRole("button", { name: "Import 1 student", exact: true })).toBeDisabled();
  await page.locator("#import-session").selectOption(String(emptySessionId));
  await expect(page.getByRole("group", { name: "Available classes (0)" })).toContainText("Create classes");
  await expect(page.getByRole("button", { name: "Download Word template" })).toBeDisabled();
});

test("portal pages and open forms fit desktop, tablet, and phone screens", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    for (const path of ["/dashboard", "/students", "/academics", "/questions", "/results", "/reports", "/promotion", "/settings", "/settings/password-audit"]) {
      await page.goto(path);
      await expect(page.locator(".main-content")).toBeVisible();
      // Open forms to catch overflow hidden by their collapsed state.
      for (const panel of await page.locator("main details.panel").all()) {
        if (await panel.getAttribute("open") === null) await panel.locator("summary").click();
        await expect(panel).toHaveAttribute("open", "");
      }
      const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
      expect(dimensions.content, `${path} at ${width}px`).toBeLessThanOrEqual(dimensions.width + 1);
      for (const empty of await page.locator(".table .empty-state").all()) {
        const bounds = (await empty.boundingBox())!;
        expect(bounds.x + bounds.width, `Empty state on ${path} at ${width}px`).toBeLessThanOrEqual(width);
      }
      if (width === 390 && path === "/students") {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: testInfo.outputPath("students-mobile.png"), fullPage: true });
      }
    }
  }
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});
