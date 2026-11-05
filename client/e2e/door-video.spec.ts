import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

mkdirSync("/opt/cursor/artifacts", { recursive: true });

test("desktop door click lands on the team page", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/home");
  await expect(page.getByRole("button", { name: /Hale Design Lab/ })).toBeVisible();
  await page.getByRole("button", { name: /Hale Design Lab/ }).click();
  await expect(page).toHaveURL(/\/team\/hale-design-lab$/, { timeout: 5000 });
  await expect(page.getByRole("heading", { name: "CEO chat — PR #2" })).toBeVisible();
  await page.waitForTimeout(500);
  const video = page.video();
  await page.close();
  if (video) await video.saveAs("/opt/cursor/artifacts/door-open-desktop.webm");
});
