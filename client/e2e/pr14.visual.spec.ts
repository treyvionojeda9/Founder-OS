import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const pr14 = "../docs/screenshots/pr14-splash";
mkdirSync(pr14, { recursive: true });
mkdirSync("/opt/cursor/artifacts/screenshots/pr14-splash", { recursive: true });

const night = "rgb(27, 26, 36)";
const paper = "rgb(233, 223, 199)";

async function keep(page: Page, name: string) {
  const path = `${pr14}/${name}.png`;
  await page.screenshot({ path, animations: "disabled" });
  copyFileSync(path, `/opt/cursor/artifacts/screenshots/pr14-splash/${name}.png`);
}

async function size(page: Page, project: string) {
  if (project === "tablet-portrait") await page.setViewportSize({ width: 1000, height: 1600 });
  if (project === "tablet-landscape") await page.setViewportSize({ width: 1600, height: 1000 });
}

type Tally = { flame: number; ember: number; night: number; clear: number; other: number };

async function tallyFlame(page: Page): Promise<Tally> {
  return page.locator(".splash-flame canvas").evaluate((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    const empty: Tally = { flame: 0, ember: 0, night: 0, clear: 0, other: 0 };
    if (!ctx) return empty;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const tally: Tally = { flame: 0, ember: 0, night: 0, clear: 0, other: 0 };
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3] ?? 0;
      if (a < 200) {
        tally.clear += 1;
        continue;
      }
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      if (r === 242 && g === 193 && b === 78) tally.flame += 1;
      else if (r === 210 && g === 140 && b === 64) tally.ember += 1;
      else if (r === 27 && g === 26 && b === 36) tally.night += 1;
      else tally.other += 1;
    }
    return tally;
  });
}

test.describe("splash flame", () => {
  test("core frame sits on the night void", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj !== "tablet-portrait" && proj !== "desktop", "tablet and desktop shots");
    await size(page, proj);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Spark of Freedom" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Spark of Freedom flame" })).toBeVisible();
    const mark = page.locator(".splash-flame");
    await expect(mark).toHaveAttribute("data-motion", "still");
    await expect(mark).toHaveAttribute("data-frame", "0");
    await expect(page.locator(".splash-flame canvas")).toHaveCount(1);
    await expect(page.locator(".splash")).toHaveCSS("background-color", night);
    await expect(page.locator(".splash-card")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(page.locator(".splash-card")).toHaveCSS("border-top-width", "0px");

    const wordmark = page.locator(".splash .wordmark");
    await expect(wordmark).toHaveCSS("font-size", "32px");
    await expect(wordmark).toHaveCSS("line-height", "56px");
    await expect(wordmark).toHaveCSS("color", paper);
    const family = await wordmark.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family.toLowerCase()).toContain("press start");
    expect(family.toLowerCase()).not.toContain("system-ui");

    const canvas = page.locator(".splash-flame canvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("splash flame missing");
    expect(box.width % 20).toBe(0);
    expect(box.height % 52).toBe(0);
    const scale = box.width / 20;
    expect(scale === 4 || scale === 6).toBe(true);
    expect(Number.isInteger(scale)).toBe(true);

    await expect.poll(() => tallyFlame(page).then((tally) => tally.flame)).toBeGreaterThan(20);
    const painted = await tallyFlame(page);
    expect(painted.ember).toBeGreaterThan(20);
    expect(painted.night).toBeGreaterThan(8);
    expect(painted.clear).toBeGreaterThan(0);
    expect(painted.other).toBe(0);
    expect(painted.flame).toBeGreaterThan(painted.night);

    await page.waitForTimeout(400);
    await expect(mark).toHaveAttribute("data-frame", "0");
    await expect(page).toHaveURL(/\/$/);
    await keep(page, `splash-${proj}`);
  });

  test("the flame cycles three frames when motion is allowed", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one cycle");
    await page.clock.install();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const mark = page.locator(".splash-flame");
    await expect(mark).toHaveAttribute("data-motion", "flicker");
    await expect(mark).toHaveAttribute("data-frame", "0");
    await expect(page).toHaveURL(/\/$/);

    await page.clock.runFor(180);
    await expect(mark).toHaveAttribute("data-frame", "1");
    await page.clock.runFor(180);
    await expect(mark).toHaveAttribute("data-frame", "2");
    await page.clock.runFor(180);
    await expect(mark).toHaveAttribute("data-frame", "0");
    await expect(page).toHaveURL(/\/$/);

    await page.clock.runFor(1500);
    await expect(page).toHaveURL(/\/home$/);
  });
});
