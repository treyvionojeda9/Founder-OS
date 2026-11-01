import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { founderEmber, schoolAccent } from "../src/design/palette";
import { channelLuma } from "../src/hall/spaceSkin";

const shotDir = "../docs/screenshots/work-school-spaces";
const artifactDir = "/opt/cursor/artifacts/screenshots/work-school-spaces";
mkdirSync(shotDir, { recursive: true });
mkdirSync(artifactDir, { recursive: true });

const flame = rgb(founderEmber.flame);
const ember = rgb(founderEmber.ember);
const sky = rgb(schoolAccent.sky);
const navy = rgb(schoolAccent.navy);

function rgb(hex: string) {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

async function keep(page: Page, name: string) {
  const path = `${shotDir}/${name}.png`;
  await page.screenshot({ path, animations: "disabled" });
  copyFileSync(path, `${artifactDir}/${name}.png`);
}

async function vaultCounts(page: Page) {
  return page.evaluate(async () => {
    const known = (await indexedDB.databases?.()) ?? [];
    if (!known.some((db) => db.name === "FounderOSLocalDB")) return { human: 0, machine: 0 };
    const open = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("FounderOSLocalDB");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const count = (name: string) =>
      new Promise<number>((resolve, reject) => {
        if (!open.objectStoreNames.contains(name)) {
          resolve(0);
          return;
        }
        const tx = open.transaction(name, "readonly");
        const req = tx.objectStore(name).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    const human = await count("humanNotes");
    const machine = await count("machineNotes");
    open.close();
    return { human, machine };
  });
}

async function lumaAt(page: Page, fx: number, fy: number) {
  return page.locator(".space-layer[data-live='hold'], .space-layer[data-live='in']").last().evaluate(
    (canvas: HTMLCanvasElement, point) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return 0;
      const spanX = Math.max(4, Math.floor(canvas.width * 0.03));
      const spanY = Math.max(4, Math.floor(canvas.height * 0.03));
      const x0 = Math.max(0, Math.min(canvas.width - spanX, Math.floor(point.fx * canvas.width) - Math.floor(spanX / 2)));
      const y0 = Math.max(0, Math.min(canvas.height - spanY, Math.floor(point.fy * canvas.height) - Math.floor(spanY / 2)));
      const { data } = ctx.getImageData(x0, y0, spanX, spanY);
      let best = 0;
      for (let i = 0; i < data.length; i += 4) {
        const luma = 0.299 * (data[i] ?? 0) + 0.587 * (data[i + 1] ?? 0) + 0.114 * (data[i + 2] ?? 0);
        if (luma > best) best = luma;
      }
      return best;
    },
    { fx, fy },
  );
}

async function census(page: Page) {
  return page.locator(".space-layer[data-live='hold'], .space-layer[data-live='in']").last().evaluate(
    (canvas: HTMLCanvasElement, colors) => {
      const ctx = canvas.getContext("2d");
      if (!ctx || canvas.width < 2) return null;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const tally = { flame: 0, ember: 0, sky: 0, navy: 0, bright: 0, cool: 0 };
      const step = 8;
      for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
          const i = (y * canvas.width + x) * 4;
          const r = data[i] ?? 0;
          const g = data[i + 1] ?? 0;
          const b = data[i + 2] ?? 0;
          const a = data[i + 3] ?? 0;
          if (a < 200) continue;
          if (r === colors.flame.r && g === colors.flame.g && b === colors.flame.b) tally.flame += 1;
          else if (r === colors.ember.r && g === colors.ember.g && b === colors.ember.b) tally.ember += 1;
          else if (r === colors.sky.r && g === colors.sky.g && b === colors.sky.b) tally.sky += 1;
          else if (r === colors.navy.r && g === colors.navy.g && b === colors.navy.b) tally.navy += 1;
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          if (luma >= 140) tally.bright += 1;
          if (luma >= 70 && luma <= 130) tally.cool += 1;
        }
      }
      return tally;
    },
    { flame, ember, sky, navy },
  );
}

test.describe("work and school spaces", () => {
  test("desktop backs differ, grayscale holds, and the toggle crossfades", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop shots");
    test.setTimeout(90_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/home");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".hall")).toHaveAttribute("data-space", "work");
    await expect(page.locator(".hall")).toHaveAttribute("data-motion", "cut");
    await expect(page.locator(".hall")).toHaveAttribute("data-frames", "1");
    await expect(page.locator(".space-layer")).toHaveAttribute("data-painted", "true");
    await expect(page.locator("[data-hall=void]")).toHaveCSS("background-color", "rgb(27, 26, 36)");
    await expect(page.locator("canvas.vignette")).toHaveCount(0);

    const work = await census(page);
    expect(work).not.toBeNull();
    expect(work?.flame).toBeGreaterThan(4);
    expect(work?.ember).toBeGreaterThan(4);
    expect(work?.sky).toBe(0);
    expect(work?.bright).toBeGreaterThan(20);
    const workShaft = await lumaAt(page, 0.26, 0.2);
    const workPool = await lumaAt(page, 0.34, 0.83);
    expect(workShaft).toBeLessThan(70);
    expect(workPool).toBeGreaterThanOrEqual(140);
    await keep(page, "work-desktop");

    await page.getByRole("tab", { name: "School" }).click();
    await expect(page.locator(".hall")).toHaveAttribute("data-space", "school");
    await expect(page.locator(".space-layer[data-live='out']")).toHaveCount(0);
    expect(await page.locator(".door-grid").evaluate((el) => el.getAnimations().length)).toBe(0);
    await expect(page.locator(".space-layer")).toHaveAttribute("data-pattern", "shafts");
    await expect(page.locator(".space-layer")).toHaveAttribute("data-painted", "true");
    const school = await census(page);
    expect(school?.sky).toBeGreaterThan(4);
    expect(school?.navy).toBeGreaterThan(4);
    expect(school?.flame).toBe(0);
    expect(school?.bright).toBe(0);
    const schoolShaft = await lumaAt(page, 0.26, 0.2);
    const schoolPool = await lumaAt(page, 0.34, 0.83);
    expect(schoolShaft).toBeGreaterThan(workShaft);
    expect(schoolShaft).toBeGreaterThanOrEqual(70);
    expect(schoolShaft).toBeLessThanOrEqual(130);
    expect(schoolPool).toBeLessThan(140);
    expect(channelLuma(sky.r, sky.g, sky.b)).toBeGreaterThan(channelLuma(27, 26, 36));
    expect(channelLuma(flame.r, flame.g, flame.b)).toBeGreaterThan(140);
    await keep(page, "school-desktop");

    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    await expect(page.getByRole("tab", { name: "School" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("button", { name: "Open Reading Room" })).toBeVisible();
    await keep(page, "grayscale");
    await page.evaluate(() => {
      document.documentElement.style.filter = "";
    });

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.getByRole("tab", { name: "Work" }).click();
    await expect(page.locator(".hall")).toHaveAttribute("data-motion", "crossfade");
    await expect(page.locator(".hall")).toHaveAttribute("data-frames", "4");
    await expect(page.locator(".space-layer[data-live='in']")).toHaveCount(1);
    const name = await page.locator(".space-layer[data-live='in']").evaluate((el) => getComputedStyle(el).animationName);
    expect(name).toContain("space-fade-in");
    await page.evaluate(() => {
      for (const animation of document.getAnimations()) {
        if (animation instanceof CSSAnimation && animation.animationName.startsWith("space-fade")) {
          animation.pause();
          animation.currentTime = 120;
        }
      }
    });
    await keep(page, "toggle");
  });

  test("tablet shows the school space in one frame", async ({ page }, info) => {
    test.skip(info.project.name !== "tablet-portrait", "tablet portrait");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/home");
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole("tab", { name: "School" }).click();
    await expect(page.locator(".hall")).toHaveAttribute("data-frames", "1");
    await expect(page.locator(".space-layer")).toHaveAttribute("data-lighting", "school");
    await expect(page.locator(".app")).toHaveAttribute("data-layout", "portrait");
    const school = await census(page);
    expect(school?.sky).toBeGreaterThan(4);
    expect(school?.flame).toBe(0);
    await keep(page, "tablet");
  });

  test("sound is a local mute and the wings keep mail, go-to, tiles, shelves, and the team dock", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop integrity");
    test.setTimeout(90_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/home");
    await page.evaluate(() => document.fonts.ready);
    const before = await vaultCounts(page);

    await page.getByRole("button", { name: "Sound" }).click();
    await expect(page.locator("[data-fixture='space-sound']")).toHaveAttribute("data-sound", "sound");
    const stored = await page.evaluate(() => localStorage.getItem("founder-os.space-sound"));
    expect(stored).toBe("sound");
    expect(await vaultCounts(page)).toEqual(before);

    await page.keyboard.press("Control+k");
    await expect(page.locator(".command-ledger")).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Open Hale Design Lab" }).click();
    await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.locator(".mail-slot")).toBeVisible();
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-arrange", "tiles");
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-lighting", "ember");
    await expect(page.locator(".agent-desk-wall .space-wash")).toHaveAttribute("data-pattern", "pools");

    await page.getByRole("button", { name: "Library" }).click();
    await expect(page.locator(".library-room")).toHaveAttribute("data-ready", "true");
    await expect(page.locator(".shelf-bay").first()).toBeVisible();

    await page.getByRole("button", { name: "Team" }).click();
    await expect(page.locator(".team-board")).toBeVisible();
    await expect(page.getByRole("button", { name: "Swap seat" }).first()).toBeVisible();

    await page.goto("/learn/reading-room");
    await expect(page.locator(".study-stage")).toHaveAttribute("data-space", "school");
    await expect(page.locator(".study-stage")).toHaveAttribute("data-lighting", "school");
    await expect(page.locator(".back-wall .space-wash")).toHaveAttribute("data-pattern", "shafts");
    await expect(page.locator(".desk-top .space-wash")).toHaveAttribute("data-pattern", "band");
    await expect(page.locator(".desk-pool")).toHaveAttribute("data-pool-palette", "ember");
    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });
  });
});
