import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const pr5 = "../docs/screenshots/pr5";
mkdirSync(pr5, { recursive: true });
mkdirSync("/opt/cursor/artifacts", { recursive: true });

test("overview desks open into a paper chat and back", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/team/hale-design-lab");
  await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page.getByRole("button", { name: "Atelier" })).toBeVisible();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Atelier" }).click();
  await expect(page.getByRole("heading", { name: "Atelier chat" })).toBeVisible({ timeout: 2000 });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await page.waitForTimeout(400);
  const video = page.video();
  await page.close();
  if (video) {
    const saved = "/opt/cursor/artifacts/overview-desk-chat.webm";
    await video.saveAs(saved);
    copyFileSync(saved, `${pr5}/overview-desk-chat.webm`);
  }
});
