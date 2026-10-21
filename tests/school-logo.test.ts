import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { v2 as sdk } from "cloudinary";

const mocks = vi.hoisted(() => ({ owner: vi.fn(), user: vi.fn(), school: vi.fn(), update: vi.fn(), destroy: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireOwner: mocks.owner, requireUser: mocks.user }));
vi.mock("@/lib/db", () => ({ db: { school: { findUnique: mocks.school, update: mocks.update } } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/cloudinary", async () => {
  const { v2 } = await vi.importActual<typeof import("cloudinary")>("cloudinary");
  return { cloudinary: {
    utils: v2.utils,
    url: (id: string, options: object) => v2.url(id, { ...options, cloud_name: "logo-unit-test" }),
    uploader: { destroy: mocks.destroy },
  } };
});

import { POST } from "../app/api/uploads/sign/route";
import { removeSchoolLogo, saveSchoolLogo, updateSchoolSettings } from "../app/actions/admin";

const secret = "unit-test-secret";
function uploaded(publicId = "standard-schools/2/logos/new-logo") {
  const version = 1700000000;
  return { publicId, version, format: "png" as const, signature: sdk.utils.api_sign_request({ public_id: publicId, version }, secret) };
}
const request = (kind: string) => new Request("http://localhost/api/uploads/sign", { method: "POST", body: JSON.stringify({ kind }) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("CLOUDINARY_CLOUD_NAME", "logo-unit-test");
  vi.stubEnv("CLOUDINARY_API_KEY", "unit-test-key");
  vi.stubEnv("CLOUDINARY_API_SECRET", secret);
  mocks.owner.mockResolvedValue({ id: "owner", schoolId: 2, role: "OWNER" });
  mocks.user.mockResolvedValue({ id: "owner", schoolId: 2, role: "OWNER" });
  mocks.school.mockResolvedValue({ logoPublicId: "standard-schools/2/logos/old-logo" });
  mocks.update.mockResolvedValue({});
  mocks.destroy.mockResolvedValue({ result: "ok" });
});
afterEach(() => vi.unstubAllEnvs());

describe("school logo uploads", () => {
  it("signs an owner upload with the school folder and permitted image formats", async () => {
    const response = await POST(request("school-logo"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ folder: "standard-schools/2/logos", allowed_formats: "jpg,jpeg,png,webp" });
    expect(body.signature).toBe(sdk.utils.api_sign_request({ folder: body.folder, timestamp: body.timestamp, allowed_formats: body.allowed_formats }, secret));
    expect(JSON.stringify(body)).not.toContain(secret);
  });

  it("rejects staff logo uploads, invalid types, and missing upload configuration", async () => {
    mocks.user.mockResolvedValue({ schoolId: 2, role: "STAFF" });
    expect((await POST(request("school-logo"))).status).toBe(403);
    expect((await POST(request("unknown"))).status).toBe(400);
    vi.stubEnv("CLOUDINARY_API_SECRET", "");
    expect((await POST(request("student-photo"))).status).toBe(503);
  });

  it("keeps the existing student and question upload folders", async () => {
    for (const [kind, folder] of [["student-photo", "student-photos"], ["question", "questions"]]) {
      const body = await (await POST(request(kind))).json();
      expect(body.folder).toBe(`standard-schools/2/${folder}`);
      expect(body).not.toHaveProperty("allowed_formats");
    }
  });

  it("requires an owner for saving and removing a logo", async () => {
    mocks.owner.mockRejectedValue(new Error("owner-required"));
    await expect(saveSchoolLogo(uploaded())).rejects.toThrow("owner-required");
    await expect(removeSchoolLogo()).rejects.toThrow("owner-required");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects another school's asset and a forged upload response", async () => {
    await expect(saveSchoolLogo(uploaded("standard-schools/3/logos/asset"))).rejects.toThrow("Invalid logo upload");
    await expect(saveSchoolLogo({ ...uploaded(), signature: "0".repeat(40) })).rejects.toThrow("could not be verified");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.destroy).not.toHaveBeenCalled();
  });

  it("builds the URL from a verified asset, saves both fields, and then removes the old asset", async () => {
    const input = { ...uploaded(), logoUrl: "https://untrusted.example/logo.png" };
    await saveSchoolLogo(input);
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: 2 }, data: {
      logoUrl: expect.stringContaining("https://res.cloudinary.com/logo-unit-test/image/upload/v1700000000/standard-schools/2/logos/new-logo.png"),
      logoPublicId: input.publicId,
    } });
    expect(mocks.revalidate).toHaveBeenCalledWith("/(portal)", "layout");
    expect(mocks.destroy).toHaveBeenCalledWith("standard-schools/2/logos/old-logo", { invalidate: true });
    expect(mocks.update.mock.invocationCallOrder[0]).toBeLessThan(mocks.destroy.mock.invocationCallOrder[0]);
  });

  it("keeps the old asset when saving the new logo fails", async () => {
    mocks.update.mockRejectedValue(new Error("database-unavailable"));
    await expect(saveSchoolLogo(uploaded())).rejects.toThrow("database-unavailable");
    expect(mocks.destroy).not.toHaveBeenCalled();
  });

  it("removes the saved logo and cleans up only the school's own asset", async () => {
    await removeSchoolLogo();
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { logoUrl: null, logoPublicId: null } });
    expect(mocks.destroy).toHaveBeenCalledWith("standard-schools/2/logos/old-logo", { invalidate: true });
    mocks.destroy.mockClear();
    mocks.school.mockResolvedValue({ logoPublicId: "standard-schools/3/logos/foreign-logo" });
    await removeSchoolLogo();
    expect(mocks.destroy).not.toHaveBeenCalled();
  });

  it("keeps the saved replacement if old asset cleanup is unavailable", async () => {
    mocks.destroy.mockRejectedValue(new Error("cleanup-unavailable"));
    await expect(saveSchoolLogo(uploaded())).resolves.toBeUndefined();
    expect(mocks.update).toHaveBeenCalled();
  });

  it("does not clear or replace the logo when ordinary school settings are saved", async () => {
    const form = new FormData();
    form.set("name", "School Two");
    form.set("shortName", "S2");
    form.set("logoUrl", "https://untrusted.example/not-an-upload.png");
    await updateSchoolSettings(form);
    const data = mocks.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("logoUrl");
    expect(data).not.toHaveProperty("logoPublicId");
  });
});
