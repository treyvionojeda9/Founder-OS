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
      use: { ...tablet, viewport: { width: 1000, height: 1600 } },
    },
    {
      name: "tablet-landscape",
      use: { ...tablet, viewport: { width: 1600, height: 1000 } },
    },
    {
      name: "desktop",
      use: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, hasTouch: false },
    },
  ],
});
