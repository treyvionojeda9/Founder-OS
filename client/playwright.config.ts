import { defineConfig } from "@playwright/test";

const tablet = {
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
};

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:5173",
    browserName: "chromium",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "tablet-portrait",
      testIgnore: /door-video/,
      use: { ...tablet, viewport: { width: 800, height: 1280 } },
    },
    {
      name: "tablet-landscape",
      testIgnore: /door-video/,
      use: { ...tablet, viewport: { width: 1280, height: 800 } },
    },
    {
      name: "desktop",
      testIgnore: /door-video/,
      use: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, hasTouch: false },
    },
    {
      name: "desktop-video",
      testMatch: /door-video\.spec\.ts/,
      use: {
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        hasTouch: false,
        video: { mode: "on", size: { width: 1440, height: 900 } },
      },
    },
  ],
});
