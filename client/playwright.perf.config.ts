import { defineConfig } from "@playwright/test";

/** Production build, tablet portrait, throttled in the spec. Not the dev server. */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /perf-budget\.spec\.ts/,
  timeout: 120_000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    viewport: { width: 800, height: 1280 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  },
  webServer: {
    command: "node scripts/preview-gzip.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
