import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const pr7 = "../docs/screenshots/pr7";
mkdirSync(pr7, { recursive: true });
mkdirSync("/opt/cursor/artifacts", { recursive: true });

test("empty shelf, save a note, open it, and back to the study", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/team/hale-design-lab");
  await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
  await page.getByRole("button", { name: "Library" }).click();
  await expect(page.getByText("The shelf is bare.")).toBeVisible();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Place a sheet" }).click();
  await expect(page.locator(".library-paper")).toHaveAttribute("data-pose", "lifted");
  await page.getByRole("textbox", { name: "Your note" }).fill("One sheet on the human shelf.");
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "Save this note" }).click();
  await expect(page.getByText("Saved on the shelf.")).toBeVisible();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Set it down" }).click();
  await expect(page.getByRole("button", { name: "One sheet on the human shelf." })).toBeVisible();
  await page.waitForTimeout(450);
  await page.getByRole("button", { name: "One sheet on the human shelf." }).click();
  await expect(page.getByRole("textbox", { name: "Your note" })).toHaveValue("One sheet on the human shelf.");
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
  await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
  await page.waitForTimeout(400);
  const video = page.video();
  await page.close();
  if (video) {
    const saved = "/opt/cursor/artifacts/work-library.webm";
    await video.saveAs(saved);
    copyFileSync(saved, `${pr7}/work-library.webm`);
  }
});
