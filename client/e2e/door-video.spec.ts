import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const pr3 = "../docs/screenshots/pr3";
mkdirSync("/opt/cursor/artifacts", { recursive: true });
mkdirSync(pr3, { recursive: true });

test("open the door into the CEO room and come back", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/home");
  await expect(page.getByRole("button", { name: /Hale Design Lab/ })).toBeVisible();
  await page.getByRole("button", { name: /Hale Design Lab/ }).click();
  await expect(page).toHaveURL(/\/team\/hale-design-lab$/, { timeout: 5000 });
  await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/home$/, { timeout: 5000 });
  await expect(page.getByRole("button", { name: /Hale Design Lab/ })).toBeFocused();
  await page.waitForTimeout(400);
  const video = page.video();
  await page.close();
  if (video) {
    const saved = "/opt/cursor/artifacts/open-room-back.webm";
    await video.saveAs(saved);
    copyFileSync(saved, `${pr3}/open-room-back.webm`);
  }
});
