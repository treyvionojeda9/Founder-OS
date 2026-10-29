import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const pr9 = "../docs/screenshots/pr9";
mkdirSync(pr9, { recursive: true });
mkdirSync("/opt/cursor/artifacts", { recursive: true });

test("lift the ponder sheet, draw, keep, and find the ink again", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/learn/reading-room");
  await expect(page.locator(".learn-room")).toHaveAttribute("data-ready", "true");
  await page.getByRole("heading", { name: "Ponder" }).click();
  await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "lifted");
  await page.waitForTimeout(300);
  const canvas = page.locator("canvas.ponder-ink");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("ink sheet has no box");
  const x = box.x + box.width * 0.25;
  const y = box.y + box.height * 0.4;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + box.width * 0.35, y + 30, { steps: 16 });
  await page.mouse.move(x + 40, y + box.height * 0.28, { steps: 16 });
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-strokes", "1");
  await page.waitForTimeout(400);
  await page.getByRole("textbox", { name: "Your note" }).fill("A line under the ink.");
  await page.getByRole("button", { name: "Keep this note" }).click();
  await expect(page.getByRole("status")).toHaveText("Kept with your notes.");
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "Set it down" }).click();
  await expect(page.locator("canvas.ponder-ink")).toHaveAttribute("data-strokes", "1");
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.locator(".learn-room")).toHaveAttribute("data-ready", "true");
  await expect(page.locator("canvas.ponder-ink")).toHaveAttribute("data-strokes", "1");
  await expect(page.getByText("A line under the ink.")).toBeVisible();
  await page.waitForTimeout(400);
  const video = page.video();
  await page.close();
  if (video) {
    const saved = "/opt/cursor/artifacts/ponder-ink.webm";
    await video.saveAs(saved);
    copyFileSync(saved, `${pr9}/ponder-ink.webm`);
  }
});
