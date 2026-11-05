import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const pr11 = "../docs/screenshots/pr11-room-materials";
mkdirSync(pr11, { recursive: true });
mkdirSync("/opt/cursor/artifacts/screenshots/pr11-room-materials", { recursive: true });

const night = "27,26,36";
const slate = "61,61,74";
const wood = "143,86,59";
const darkwood = "79,53,46";
const plum = "133,69,80";
const navy = "9,56,142";
const sky = "53,102,189";
const schoolSlate = "79,81,120";
const emberFills = new Set([night, slate, wood, darkwood]);

async function keep(page: Page, name: string) {
  const path = `${pr11}/${name}.png`;
  await page.screenshot({ path, animations: "disabled" });
  copyFileSync(path, `/opt/cursor/artifacts/screenshots/pr11-room-materials/${name}.png`);
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
    const mask = style.maskImage;
    const matched = image.match(/base64,([^"')]+)/);
    if (!matched) return { image, mask, colors: [] as string[] };
    const response = await fetch(`data:image/png;base64,${matched[1]}`);
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { image, mask, colors: [] as string[] };
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bitmap, 0, 0);
    const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
    const colors = new Set<string>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    }
    return { image, mask, colors: [...colors] };
  });
}

test.describe("room materials", () => {
  test("study, school, library, team, and overview use tiled fills", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj === "desktop-video", "visual projects only");
    test.setTimeout(90_000);
    await size(page, proj);
    const shot = proj === "tablet-portrait" || proj === "desktop";

    await page.goto("/team/hale-design-lab");
    await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
    const wall = await tileColors(page, ".back-wall");
    const floor = await tileColors(page, ".floor-plane");
    const wainscot = await tileColors(page, ".wainscot");
    const desk = await tileColors(page, ".desk-top");
    for (const fill of [wall, floor, wainscot, desk]) {
      expect(fill.image).toContain("data:image/png");
      expect(fill.image).not.toContain("gradient");
      expect(fill.mask).not.toContain("gradient");
      expect(fill.colors.length).toBeGreaterThan(0);
      for (const color of fill.colors) expect(emberFills.has(color)).toBe(true);
    }
    expect(wall.colors).toContain(night);
    expect(wall.colors).toContain(slate);
    expect(floor.colors).toContain(wood);
    expect(floor.colors).toContain(darkwood);
    expect(floor.colors).not.toContain(plum);
    if (shot) await keep(page, `ceo-${proj}`);

    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    const cardFloor = await tileColors(page, ".agent-desk-floor");
    const cardWall = await tileColors(page, ".agent-desk-wall");
    expect(cardFloor.colors).toContain(wood);
    expect(cardFloor.colors).not.toContain(plum);
    expect(cardWall.colors).toContain(night);
    expect(cardWall.mask).not.toContain("gradient");
    await expect(page.locator(".agent-desk[data-status='working'] .status-chip")).toContainText("Working");
    await expect(page.locator(".agent-desk[data-status='idle'] .status-chip")).toContainText("Idle");
    await expect(page.locator(".agent-desk[data-status='failed'] .status-chip")).toContainText("Failed");
    if (shot) await keep(page, `overview-${proj}`);

    await page.getByRole("button", { name: "Library" }).click();
    await expect(page.locator(".library-room")).toHaveAttribute("data-ready", "true");
    await expect(page.locator(".library-room")).toHaveAttribute("data-vault", "human");
    const back = await tileColors(page, ".shelf-bays");
    const libFloor = await tileColors(page, ".library-floor");
    expect(back.colors.every((color) => emberFills.has(color))).toBe(true);
    expect(back.colors).toContain(wood);
    expect(libFloor.colors).not.toContain(plum);
    expect(libFloor.mask).not.toContain("gradient");
    const caseShadow = await page.locator(".bookcase").evaluate((el) => getComputedStyle(el).boxShadow);
    expect(caseShadow).not.toContain("133, 69, 80");
    await expect(page.getByRole("button", { name: "Place a sheet" })).toBeVisible();
    if (shot) await keep(page, `library-${proj}`);

    await page.getByRole("button", { name: "Team" }).click();
    await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
    const teamWall = await tileColors(page, ".team-board");
    const teamFloor = await tileColors(page, ".board-floor");
    expect(teamWall.colors).toContain(slate);
    expect(teamFloor.colors).toContain(wood);
    expect(teamWall.mask).not.toContain("gradient");
    await expect(page.locator(".plaque[data-status='failed'] .status-chip")).toContainText("Failed");
    if (shot) await keep(page, `team-${proj}`);

    await page.goto("/learn/reading-room");
    await expect(page.getByRole("heading", { name: "Ponder" })).toBeVisible();
    const schoolWall = await tileColors(page, ".study-stage[data-variant='school'] .back-wall");
    const schoolFloor = await tileColors(page, ".study-stage[data-variant='school'] .floor-plane");
    expect(schoolWall.colors).not.toContain(schoolSlate);
    expect(schoolWall.colors).not.toContain(navy);
    expect(schoolWall.colors).not.toContain(sky);
    expect(schoolFloor.colors).toContain(wood);
    await expect(page.locator(".apron-rail")).toHaveCSS("background-color", "rgb(9, 56, 142)");
    const book = await page.locator(".book-prop canvas").evaluate((canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return { navy: 0, sky: 0, otherBlue: 0 };
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let navyCount = 0;
      let skyCount = 0;
      let otherBlue = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        if (r === 9 && g === 56 && b === 142) navyCount += 1;
        else if (r === 53 && g === 102 && b === 189) skyCount += 1;
        else if (b > r + 30 && b > g + 10) otherBlue += 1;
      }
      return { navy: navyCount, sky: skyCount, otherBlue };
    });
    expect(book.navy).toBeGreaterThan(book.sky);
    expect(book.sky).toBeGreaterThan(0);
    expect(book.otherBlue).toBe(0);
    if (shot) await keep(page, `school-${proj}`);
  });
});
