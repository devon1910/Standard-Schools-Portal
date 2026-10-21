import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
    trace: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: "node node_modules/next/dist/bin/next dev",
    url: "http://127.0.0.1:3000/login",
    reuseExistingServer: !process.env.PORTAL_UI_TEST_DATABASE_URL,
    timeout: 120_000,
    env: {
      NEXTAUTH_URL: "http://127.0.0.1:3000",
      NEXTAUTH_SECRET: "playwright-only-secret",
      ...(process.env.PORTAL_UI_TEST_DATABASE_URL ? {
        DATABASE_URL: process.env.PORTAL_UI_TEST_DATABASE_URL,
        CLOUDINARY_CLOUD_NAME: "portal-ui-test",
        CLOUDINARY_API_KEY: "portal-ui-key",
        CLOUDINARY_API_SECRET: "portal-ui-secret",
        CLOUDINARY_URL: "cloudinary://portal-ui-key:portal-ui-secret@portal-ui-test?upload_prefix=http%3A%2F%2F127.0.0.1%3A55439",
      } : {}),
    },
  },
});
