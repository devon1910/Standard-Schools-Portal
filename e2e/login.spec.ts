import { expect, test } from "@playwright/test";

test("login screen is accessible and does not expose an API token", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByLabel("Username")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
  await expect(page.locator("body")).not.toContainText("VITE_API_URL");
});

test("family login is separate and protected pages require sign-in", async ({ page }) => {
  await page.goto("/family/login");
  await expect(page.getByRole("heading", { name: "Student and guardian sign in" })).toBeVisible();
  await expect(page.getByLabel("Username")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
  await page.goto("/family/reports/1");
  await expect(page).toHaveURL(/\/family\/login$/);
  await expect(page.getByRole("heading", { name: "Student and guardian sign in" })).toBeVisible();
});
