import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const shotDir = "../docs/screenshots/reading-room-depth";
const artifactDir = "/opt/cursor/artifacts/screenshots/reading-room-depth";
mkdirSync(shotDir, { recursive: true });
mkdirSync(artifactDir, { recursive: true });

async function keep(page: Page, name: string) {
  const path = `${shotDir}/${name}.png`;
  await page.screenshot({ path, animations: "disabled" });
  copyFileSync(path, `${artifactDir}/${name}.png`);
}

function restsOn(object: { y: number; height: number } | null, surface: { y: number; height: number } | null) {
  if (!object || !surface) throw new Error("desk object missing");
  const bottom = object.y + object.height;
  const surfaceBottom = surface.y + surface.height;
  expect(bottom).toBeGreaterThan(surface.y + surface.height * 0.4);
  expect(bottom).toBeLessThan(surfaceBottom + 56);
}

async function openReadingRoom(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn/reading-room");
  await expect(page.locator(".learn-room")).toHaveAttribute("data-ready", "true");
  await expect(page.getByRole("heading", { name: "Ponder" })).toBeVisible();
}

test.describe("reading room depth", () => {
  test("shows a walled study, a desk with volume, and returns focus from the path book", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj === "desktop-video", "visual projects only");
    await openReadingRoom(page);

    await expect(page.locator(".study-stage")).toHaveAttribute("data-variant", "school");
    await expect(page.locator(".back-wall")).toHaveAttribute("data-material", "plaster");
    await expect(page.locator(".window-sill")).toBeVisible();
    await expect(page.locator(".window-star")).toHaveCount(3);
    await expect(page.locator(".wall-bay")).toHaveCount(4);
    await expect(page.locator(".desk-top")).toBeVisible();
    await expect(page.locator(".desk-front")).toBeVisible();
    await expect(page.locator(".desk-leg")).toHaveCount(2);
    await expect(page.locator(".reading-shadow")).toBeVisible();
    await expect(page.locator(".desk-pool")).toHaveAttribute("data-pool", "working");
    await expect(page.locator(".desk-pool")).toHaveAttribute("data-pool-palette", "ember");

    const boards = page.locator(".floor-board");
    const sizes = await boards.evaluateAll((els) =>
      els.map((el) => {
        const box = el.getBoundingClientRect();
        return { width: box.width, height: box.height };
      }),
    );
    expect(sizes.length).toBeGreaterThan(4);
    expect(sizes[0]?.height).toBeLessThan(sizes[sizes.length - 1]?.height ?? 0);
    expect(sizes[0]?.width).toBeLessThan(sizes[sizes.length - 1]?.width ?? 0);

    const wall = await page.locator(".back-wall").boundingBox();
    const windowBox = await page.locator(".reading-window").boundingBox();
    if (!wall || !windowBox) throw new Error("reading window missing");
    expect(windowBox.y).toBeGreaterThanOrEqual(wall.y - 1);
    expect(windowBox.y + windowBox.height).toBeLessThanOrEqual(wall.y + wall.height + 8);

    const surface = await page.locator(".desk-top").boundingBox();
    restsOn(await page.locator(".book-prop").boundingBox(), surface);
    restsOn(await page.locator(".key-prop").boundingBox(), surface);
    restsOn(await page.locator(".lamp-spot").boundingBox(), surface);
    restsOn(await page.locator(".paper-slot").boundingBox(), surface);

    const glassShadow = await page.locator(".window-glass").evaluate((el) => getComputedStyle(el).boxShadow);
    expect(glassShadow).toContain("inset");

    const motion = await page.locator(".learn-room").evaluate((el) => el.getAnimations({ subtree: true }).length);
    expect(motion).toBe(0);

    if (proj === "desktop" || proj === "tablet-portrait") await keep(page, `reading-room-${proj}`);

    const heading = page.getByRole("heading", { name: "Ponder" });
    if (proj === "tablet-portrait" || proj === "tablet-landscape") await heading.tap();
    else await heading.click();
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "lifted");
    await expect(page.locator(".learn-room")).toHaveAttribute("data-focus", "sheet");
    await expect(page.getByRole("textbox", { name: "Your note" })).toBeVisible();
    if (proj === "desktop" || proj === "tablet-portrait") await keep(page, `ponder-open-${proj}`);
    await page.keyboard.press("Escape");
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "desk");
    await expect(page.locator(".learn-room")).toHaveAttribute("data-focus", "room");

    const book = page.getByRole("button", { name: "Open the current path" });
    if (proj === "tablet-portrait" || proj === "tablet-landscape") await book.tap();
    else await book.click();
    await expect(page.getByRole("dialog", { name: "Reading Room path" })).toBeVisible();
    await page.getByRole("button", { name: "Close the book" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(book).toBeFocused();
    await expect(page.locator(".desk-top")).toBeVisible();
    await expect(page.locator(".back-wall")).toBeVisible();
  });

  test("grayscale reading room still shows the desk and the wall", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one grayscale sheet");
    await openReadingRoom(page);
    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    await expect(page.locator(".desk-top")).toBeVisible();
    await expect(page.locator(".window-sill")).toBeVisible();
    await expect(page.locator(".desk-pool")).toHaveAttribute("data-pool", "working");
    await expect(page.getByRole("img", { name: "Desk lamp, lit" })).toBeVisible();
    await keep(page, "reading-room-grayscale");
  });
});
