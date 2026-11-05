import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const pr13 = "../docs/screenshots/pr13-hall";
mkdirSync(pr13, { recursive: true });
mkdirSync("/opt/cursor/artifacts/screenshots/pr13-hall", { recursive: true });

const darkwood = "rgb(79, 53, 46)";
const flame = "rgb(242, 193, 78)";
const night = "rgb(27, 26, 36)";

async function keep(page: Page, name: string) {
  const path = `${pr13}/${name}.png`;
  await page.screenshot({ path, animations: "disabled" });
  copyFileSync(path, `/opt/cursor/artifacts/screenshots/pr13-hall/${name}.png`);
}

async function size(page: Page, project: string) {
  if (project === "tablet-portrait") await page.setViewportSize({ width: 1000, height: 1600 });
  if (project === "tablet-landscape") await page.setViewportSize({ width: 1600, height: 1000 });
}

test.describe("home hall", () => {
  test("door glow, pixel labels, and the settings plate", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj !== "tablet-portrait" && proj !== "desktop", "tablet and desktop shots");
    await size(page, proj);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/home");
    await expect(page.getByRole("button", { name: /Hale Design Lab/ })).toBeVisible();
    await expect(page.locator("canvas.vignette")).toHaveCount(0);
    await expect(page.locator("[data-hall=void]")).toHaveCSS("background-color", night);

    const name = page.locator(".door-name").first();
    await expect(name).toHaveCSS("font-size", "8px");
    await expect(name).toHaveCSS("line-height", "16px");
    const nameFont = await name.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(nameFont.toLowerCase()).toContain("press start");
    expect(nameFont.toLowerCase()).not.toContain("system-ui");
    const tab = page.getByRole("tab", { name: "Work" });
    await expect(tab).toHaveCSS("font-size", "8px");
    const tabFont = await tab.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(tabFont.toLowerCase()).toContain("press start");

    const settings = page.locator(".hall-fixture:visible");
    await expect(settings).toHaveCSS("background-color", darkwood);
    await expect(settings).toHaveCSS("font-size", "8px");
    await expect(settings).toHaveCSS("border-top-width", "0px");
    const plate = await settings.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(plate.replaceAll(" ", "")).toContain("143,86,59");
    const settingsFont = await settings.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(settingsFont.toLowerCase()).toContain("press start");

    const glow = await page.locator(".light-pool .pool-a canvas").first().evaluate((canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return { flame: 0, ember: 0, wood: 0, other: 0, clear: 0 };
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const tally = { flame: 0, ember: 0, wood: 0, other: 0, clear: 0 };
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
        else if (r === 143 && g === 86 && b === 59) tally.wood += 1;
        else tally.other += 1;
      }
      return tally;
    });
    expect(glow.flame).toBeGreaterThan(8);
    expect(glow.ember).toBeGreaterThan(8);
    expect(glow.wood).toBe(0);
    expect(glow.other).toBe(0);
    const painted = glow.flame + glow.ember;
    expect(painted / (painted + glow.clear)).toBeLessThan(0.45);

    const breathe = await page.locator(".light-pool").first().evaluate((el) => getComputedStyle(el).animationName);
    expect(breathe).toBe("none");

    await keep(page, `hall-idle-${proj}`);

    const door = page.getByRole("button", { name: /Hale Design Lab/ });
    await door.focus();
    await expect(door).toBeFocused();
    const outline = await door.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).toBe("solid");
    if (proj === "tablet-portrait") await keep(page, "hall-focused-tablet-portrait");
  });

  test("settings plate uses the bar colours on press", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one press check");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/home");
    const settings = page.locator(".rail .hall-fixture");
    await expect(settings).toBeVisible();
    await settings.hover();
    await expect(settings).toHaveCSS("color", flame);
    await expect(settings).toHaveCSS("background-color", darkwood);
    const box = await settings.boundingBox();
    if (!box) throw new Error("settings plate missing");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(settings).toHaveCSS("background-color", "rgb(133, 69, 80)");
    await page.mouse.up();
  });
});
