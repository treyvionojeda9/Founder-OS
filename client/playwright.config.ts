import { defineConfig } from "@playwright/test";

const tablet = {
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
};

/** Set to a deployed or `vite preview` origin to run e2e against that build. */
const previewUrl = process.env.FOUNDER_PREVIEW_URL;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: previewUrl || "http://127.0.0.1:5173",
    browserName: "chromium",
  },
  ...(previewUrl
    ? {}
    : {
        webServer: {
          command: "npm run dev -- --host 127.0.0.1 --port 5173",
          url: "http://127.0.0.1:5173",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }),
  projects: [
    {
      name: "tablet-portrait",
      testIgnore: /video\.spec/,
      use: { ...tablet, viewport: { width: 800, height: 1280 } },
    },
    {
      name: "tablet-landscape",
      testIgnore: /video\.spec/,
      use: { ...tablet, viewport: { width: 1280, height: 800 } },
    },
    {
      name: "desktop",
      testIgnore: /video\.spec/,
      use: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, hasTouch: false },
    },
    {
      name: "desktop-video",
      testMatch: /video\.spec\.ts/,
      use: {
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        hasTouch: false,
        video: { mode: "on", size: { width: 1440, height: 900 } },
      },
    },
  ],
});
