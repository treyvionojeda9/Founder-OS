import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const overviewCss = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const floorRule = overviewCss.match(/\.agent-desk-floor\s*\{[^}]*\}/)?.[0] ?? "";
const listRule = overviewCss.match(/\.desk-grid-list\s*\{[^}]*\}/)?.[0] ?? "";

const pr15 = "../docs/screenshots/pr15-overview";
mkdirSync(pr15, { recursive: true });
mkdirSync("/opt/cursor/artifacts/screenshots/pr15-overview", { recursive: true });

const night = "27,26,36";
const slate = "61,61,74";
const wood = "143,86,59";
const darkwood = "79,53,46";
const plum = "133,69,80";
const paper = "rgb(233, 223, 199)";
const ember = "rgb(210, 140, 64)";
const floorFill = new Set([night, slate, wood, darkwood]);

async function keep(page: Page, name: string) {
  const path = `${pr15}/${name}.png`;
  await page.screenshot({ path, animations: "disabled" });
  copyFileSync(path, `/opt/cursor/artifacts/screenshots/pr15-overview/${name}.png`);
}

async function size(page: Page, project: string) {
  if (project === "tablet-portrait") await page.setViewportSize({ width: 1000, height: 1600 });
  if (project === "tablet-landscape") await page.setViewportSize({ width: 1600, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
}

async function tileColors(page: Page, selector: string) {
  return page.locator(selector).first().evaluate(async (el) => {
    const style = getComputedStyle(el);
    const image = style.backgroundImage;
    const matched = image.match(/base64,([^"')]+)/);
    if (!matched) return { image, colors: [] as string[] };
    const response = await fetch(`data:image/png;base64,${matched[1]}`);
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { image, colors: [] as string[] };
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bitmap, 0, 0);
    const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
    const colors = new Set<string>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    }
    return { image, colors: [...colors] };
  });
}

test.describe("overview desk scene", () => {
  test("one row of engraved desks fills the study", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj !== "tablet-portrait" && proj !== "desktop", "tablet and desktop shots");
    await size(page, proj);

    await page.goto("/team/hale-design-lab");
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-count", "3");
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-still", "true");
    await expect(page.locator(".desk-room")).toHaveAttribute("data-scene", "row");
    expect(floorRule).toContain("var(--darkwood)");
    expect(floorRule).not.toContain("var(--plum)");
    expect(floorRule).not.toContain("#854550");
    expect(listRule).toContain("grid-auto-flow: column");

    const floor = await tileColors(page, ".agent-desk-floor");
    const wall = await tileColors(page, ".agent-desk-wall");
    expect(floor.image).toContain("data:image/png");
    expect(floor.image).not.toContain("gradient");
    expect(floor.colors.length).toBeGreaterThan(0);
    for (const color of floor.colors) expect(floorFill.has(color)).toBe(true);
    expect(floor.colors).toContain(wood);
    expect(floor.colors).not.toContain(plum);
    expect(wall.image).toContain("data:image/png");
    expect(wall.colors).toContain(night);
    expect(wall.colors).toContain(slate);
    expect(wall.colors).not.toContain(plum);

    const desks = page.locator(".agent-desk");
    await expect(desks).toHaveCount(3);
    const tops = await desks.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(8);

    for (const status of ["working", "idle", "failed"] as const) {
      const desk = page.locator(`.agent-desk[data-status='${status}']`);
      const lamp = desk.locator(".agent-desk-lamp");
      const chip = desk.locator(".agent-desk-lamp-row .status-chip");
      const plaque = desk.locator(".agent-desk-plaque");
      await expect(chip).toBeVisible();
      await expect(plaque).toHaveAttribute("data-plaque", "engraved");
      const lampBox = await lamp.boundingBox();
      const chipBox = await chip.boundingBox();
      const plaqueBox = await plaque.boundingBox();
      if (!lampBox || !chipBox || !plaqueBox) throw new Error("desk parts missing");
      expect(chipBox.x).toBeGreaterThan(lampBox.x + lampBox.width * 0.45);
      expect(chipBox.y).toBeLessThan(lampBox.y + lampBox.height);
      expect(chipBox.y + chipBox.height).toBeGreaterThan(lampBox.y);
      expect(plaqueBox.y).toBeGreaterThan(lampBox.y);
      const nameFamily = await plaque.locator(".agent-desk-name").evaluate((el) => getComputedStyle(el).fontFamily);
      expect(nameFamily.toLowerCase()).toContain("press start");
      await expect(plaque.locator("input, textarea")).toHaveCount(0);
      const plaqueBg = await plaque.evaluate((el) => getComputedStyle(el).backgroundColor);
      const plaqueImage = await plaque.evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(plaqueBg).toBe("rgb(79, 53, 46)");
      expect(plaqueImage).toBe("none");
      expect(plaqueBg).not.toBe(paper);
      expect(plaqueBg).not.toBe("rgb(255, 255, 255)");
    }

    await expect(page.locator(".agent-desk[data-status='working'] .status-chip")).toHaveCSS("background-color", ember);
    await expect(page.locator(".agent-desk[data-status='working'] .status-chip")).toHaveCSS("color", "rgb(27, 26, 36)");
    await expect(page.locator(".agent-desk[data-status='idle'] .status-chip")).toHaveCSS("background-color", "rgb(61, 61, 74)");
    await expect(page.locator(".agent-desk[data-status='idle'] .status-chip")).toHaveCSS("color", paper);
    await expect(page.locator(".agent-desk[data-status='failed'] .status-chip")).toHaveCSS("background-color", "rgb(133, 69, 80)");
    await expect(page.locator(".agent-desk[data-status='failed'] .status-chip")).toHaveCSS("color", paper);

    const room = await page.locator(".desk-room").boundingBox();
    const viewport = page.viewportSize();
    if (!room || !viewport) throw new Error("room missing");
    expect(viewport.height - (room.y + room.height)).toBeLessThan(40);
    expect(room.height).toBeGreaterThan(viewport.height * 0.45);

    await keep(page, `overview-${proj}`);
  });

  test("grayscale still separates the three lamps", async ({ page }, info) => {
    test.skip(info.project.name !== "tablet-portrait", "one grayscale sheet");
    await size(page, "tablet-portrait");
    await page.goto("/team/hale-design-lab");
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    await expect(page.locator(".agent-desk[data-status='working'] .status-chip")).toContainText("Working");
    await expect(page.locator(".agent-desk[data-status='failed'] .status-chip")).toContainText("Failed");
    await keep(page, "overview-grayscale-tablet-portrait");
  });
});
