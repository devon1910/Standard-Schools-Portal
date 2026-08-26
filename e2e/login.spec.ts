import { expect, test } from "@playwright/test";

test("login screen is accessible and does not expose an API token", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByLabel("Username")).toBeVisible();
  await expect(page.getByLabel("Password")).toHaveAttribute("type", "password");
  await expect(page.locator("body")).not.toContainText("VITE_API_URL");
});
