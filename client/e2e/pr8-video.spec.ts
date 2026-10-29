import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const pr8 = "../docs/screenshots/pr8";
mkdirSync(pr8, { recursive: true });
mkdirSync("/opt/cursor/artifacts", { recursive: true });

test("roster, stapler slip, agent chat, and back to the study", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/team/hale-design-lab");
  await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
  await page.getByRole("button", { name: "Team" }).click();
  await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
  await expect(page.locator(".plaque")).toHaveCount(3);
  await page.waitForTimeout(450);
  await page.getByRole("button", { name: "Stapler" }).click();
  await expect(page.getByRole("menuitem", { name: "Swatch sheet" })).toBeVisible();
  await page.waitForTimeout(350);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Atelier/ }).click();
  await expect(page.getByRole("heading", { name: "Atelier chat" })).toBeVisible();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
  await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
  await page.waitForTimeout(400);
  const video = page.video();
  await page.close();
  if (video) {
    const saved = "/opt/cursor/artifacts/team-board.webm";
    await video.saveAs(saved);
    copyFileSync(saved, `${pr8}/team-board.webm`);
  }
});
