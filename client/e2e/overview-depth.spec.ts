import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

const shotDir = "../docs/screenshots/overview-depth";
const artifactDir = "/opt/cursor/artifacts/screenshots/overview-depth";
mkdirSync(shotDir, { recursive: true });
mkdirSync(artifactDir, { recursive: true });

async function keep(page: Page, name: string) {
  const path = `${shotDir}/${name}.png`;
  await page.screenshot({ path, animations: "disabled" });
  copyFileSync(path, `${artifactDir}/${name}.png`);
}

async function keepClip(page: Page, locator: Locator, name: string) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`missing box for ${name}`);
  const path = `${shotDir}/${name}.png`;
  await page.screenshot({
    path,
    animations: "disabled",
    clip: {
      x: Math.max(0, box.x),
      y: Math.max(0, box.y),
      width: Math.max(1, box.width),
      height: Math.max(1, box.height),
    },
  });
  copyFileSync(path, `${artifactDir}/${name}.png`);
}

test.describe("overview room depth", () => {
  test("seats every agent, lights only the working desk, and returns focus", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj === "desktop-video", "visual projects only");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/team/hale-design-lab");
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-count", "3");
    await expect(page.locator(".desk-room")).toHaveAttribute("data-scene", "row");

    await expect(page.locator(".agent-seat")).toHaveCount(3);
    const marks = await page.locator(".agent-seat").evaluateAll((els) => els.map((el) => el.getAttribute("data-seat")));
    expect(marks).toEqual(["hair", "hood", "collar"]);
    await expect(page.locator(".agent-desk-front")).toHaveCount(3);
    await expect(page.locator(".agent-desk-leg")).toHaveCount(6);
    await expect(page.locator(".window-sill")).toHaveCount(3);
    await expect(page.locator(".window-star")).toHaveCount(9);

    const boards = page.locator(".floor-board");
    const heights = await boards.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
    expect(heights.length).toBeGreaterThan(4);
    expect(heights[0]).toBeLessThan(heights[heights.length - 1]);

    const working = page.locator(".agent-desk[data-status='working']");
    await expect(working.locator("[data-light-pool='desk']")).toBeVisible();
    await expect(working.locator("[data-light-pool='paper']")).toBeVisible();
    await expect(working.locator("[data-light-pool='face']")).toBeVisible();
    await expect(page.locator(".agent-desk[data-status='idle'] [data-light-pool]")).toHaveCount(0);
    await expect(page.locator(".agent-desk[data-status='failed'] [data-light-pool]")).toHaveCount(0);
    await expect(page.getByRole("img", { name: "Desk lamp, failed" })).toBeVisible();

    const motion = await page.locator(".desk-room").evaluate((el) => el.getAnimations({ subtree: true }).length);
    expect(motion).toBe(0);

    if (proj === "tablet-portrait" || proj === "desktop") {
      await keep(page, `overview-${proj}`);
    }
    if (proj === "desktop") await keepClip(page, page.locator(".desk-grid-list"), "desks-working-idle-failed");

    await page.getByRole("button", { name: /Atelier/ }).click();
    await expect(page.getByRole("heading", { name: "Atelier chat" })).toBeVisible();
    await expect(page.locator(".agent-desk")).toHaveCount(0);
    if (proj === "desktop") await keep(page, "desk-chat");

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.locator(".agent-desk[data-agent='atelier']")).toBeFocused();
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-count", "3");
  });

  test("grayscale overview still shows the room", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one grayscale sheet");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/team/hale-design-lab");
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.locator(".agent-seat")).toHaveCount(3);
    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    await expect(page.locator(".agent-desk[data-status='working'] [data-light-pool='desk']")).toBeVisible();
    await expect(page.locator(".agent-desk[data-status='idle'] [data-light-pool]")).toHaveCount(0);
    await expect(page.locator(".agent-desk[data-status='failed'] [data-light-pool]")).toHaveCount(0);
    await keep(page, "overview-grayscale");
  });
});