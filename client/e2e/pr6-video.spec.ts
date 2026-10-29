import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const pr6 = "../docs/screenshots/pr6";
mkdirSync(pr6, { recursive: true });
mkdirSync("/opt/cursor/artifacts", { recursive: true });

test("school door, lift, set down, book, and back to the hall", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/home");
  await page.getByRole("tab", { name: "School" }).click();
  await expect(page.getByRole("button", { name: /Reading Room/ })).toBeVisible();
  await page.getByRole("button", { name: /Reading Room/ }).click();
  await expect(page).toHaveURL(/\/learn\/reading-room$/, { timeout: 5000 });
  const sheet = page.locator(".route-content .paper-slot");
  await expect(sheet).toHaveAttribute("data-pose", "desk");
  await expect(page.locator(".route-content .desk-apron")).toBeVisible();
  await page.waitForTimeout(400);
  await page.getByRole("heading", { name: "Ponder" }).click();
  await expect(sheet).toHaveAttribute("data-pose", "lifted");
  await page.getByRole("textbox", { name: "Your note" }).fill("One sentence, then set it down.");
  await page.waitForTimeout(450);
  await page.getByRole("button", { name: "Set it down" }).click();
  await expect(sheet).toHaveAttribute("data-pose", "desk");
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "Open the current path" }).click();
  await expect(page.getByRole("dialog", { name: "Reading Room path" })).toBeVisible();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Close the book" }).click();
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/home$/, { timeout: 5000 });
  await expect(page.getByRole("button", { name: /Reading Room/ })).toBeFocused();
  await page.waitForTimeout(400);
  const video = page.video();
  await page.close();
  if (video) {
    const saved = "/opt/cursor/artifacts/school-learning-desk.webm";
    await video.saveAs(saved);
    copyFileSync(saved, `${pr6}/school-learning-desk.webm`);
  }
});
