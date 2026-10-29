import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const pr4 = "../docs/screenshots/pr4";
mkdirSync(pr4, { recursive: true });
mkdirSync("/opt/cursor/artifacts", { recursive: true });

test("door into the room, lift the paper, set it down, and come back", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/home");
  await expect(page.getByRole("button", { name: /Hale Design Lab/ })).toBeVisible();
  await page.getByRole("button", { name: /Hale Design Lab/ }).click();
  await expect(page).toHaveURL(/\/team\/hale-design-lab$/, { timeout: 5000 });
  const sheet = page.locator(".route-content .paper-slot");
  await expect(sheet).toHaveAttribute("data-pose", "desk");
  await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
  await page.waitForTimeout(450);
  await page.getByRole("heading", { name: "CEO chat" }).click();
  await expect(sheet).toHaveAttribute("data-pose", "lifted");
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Set it down" }).click();
  await expect(sheet).toHaveAttribute("data-pose", "desk");
  await page.waitForTimeout(450);
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/home$/, { timeout: 5000 });
  await expect(page.getByRole("button", { name: /Hale Design Lab/ })).toBeFocused();
  await page.waitForTimeout(400);
  const video = page.video();
  await page.close();
  if (video) {
    const saved = "/opt/cursor/artifacts/door-room-paper.webm";
    await video.saveAs(saved);
    copyFileSync(saved, `${pr4}/door-room-paper.webm`);
  }
});
