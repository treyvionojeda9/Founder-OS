import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { ENTER_MS, SHUT_MS } from "../src/hall/doorMotion";

const shotDir = "../docs/screenshots/door-depth";
const artifactDir = "/opt/cursor/artifacts/screenshots/door-depth";
mkdirSync(shotDir, { recursive: true });
mkdirSync(artifactDir, { recursive: true });

async function keep(page: Page, name: string, animations: "allow" | "disabled" = "disabled") {
  const path = `${shotDir}/${name}.png`;
  await page.screenshot({ path, animations });
  copyFileSync(path, `${artifactDir}/${name}.png`);
}

async function seek(page: Page, ms: number) {
  await page.evaluate((time) => {
    for (const animation of document.getAnimations()) {
      animation.pause();
      animation.currentTime = time;
    }
  }, ms);
}

async function poseIndex(page: Page) {
  return page.locator(".door.is-opening .leaf-pose").evaluateAll((nodes) =>
    nodes.findIndex((el) => Number(getComputedStyle(el).opacity) > 0.5),
  );
}

test.describe("door depth", () => {
  test("work and school doors swing into the room and Back focuses the door", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj !== "tablet-portrait" && proj !== "desktop", "tablet portrait and desktop");
    test.setTimeout(90_000);
    await page.clock.install({ time: new Date("2026-10-29T12:00:00Z") });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/home");
    await expect(page.locator("[data-hall=void]")).toBeVisible();
    await page.clock.pauseAt(new Date("2026-10-29T12:00:03Z"));

    const rendering = await page.locator(".door .sprite").first().evaluate((el) => getComputedStyle(el).imageRendering);
    expect(rendering).toBe("pixelated");
    await keep(page, `hall-idle-${proj}`);

    const door = page.getByRole("button", { name: "Open Hale Design Lab" });
    await door.click();
    await expect(door).toHaveAttribute("data-phase", "swing");
    await expect(page).toHaveURL(/\/home$/);

    const timing = await page.locator(".door.is-opening .leaf-pose.is-1").evaluate((el) => getComputedStyle(el).animationTimingFunction);
    expect(timing).toMatch(/step/);

    await seek(page, 24);
    expect(await poseIndex(page)).toBe(0);
    const spillShut = await page.locator(".door.is-opening .spill").evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(spillShut).toBe(0);

    await seek(page, 80);
    expect(await poseIndex(page)).toBe(1);
    const spill = await page.locator(".door.is-opening .spill").evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(spill).toBeGreaterThan(0.5);
    const roomOpacity = await page.locator(".room-portal").evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(roomOpacity).toBe(0);
    await keep(page, `door-mid-swing-${proj}`, "allow");

    await seek(page, 140);
    expect(await poseIndex(page)).toBe(2);

    await page.clock.runFor(ENTER_MS + 200);
    await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
    await expect(page.locator(".room-portal")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
    await keep(page, `room-landing-${proj}`);

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.locator(".room-portal.is-shut")).toBeVisible();
    await page.clock.runFor(SHUT_MS + 200);
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.locator(".room-portal")).toHaveCount(0);
    await expect(door).toBeFocused();
    await keep(page, `back-to-hall-${proj}`);

    await page.getByRole("tab", { name: "School" }).click();
    const school = page.getByRole("button", { name: "Open Reading Room" });
    await expect(school).toBeVisible();
    await school.click();
    await expect(school).toHaveAttribute("data-phase", "swing");
    await expect(page).toHaveURL(/\/home$/);
    await seek(page, 80);
    const schoolSpill = await page.locator(".door.is-opening .spill").evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(schoolSpill).toBeGreaterThan(0.5);
    await page.clock.runFor(ENTER_MS + 200);
    await expect(page).toHaveURL(/\/learn\/reading-room$/);
    await expect(page.getByRole("heading", { name: "Ponder" })).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await page.clock.runFor(SHUT_MS + 200);
    await expect(page).toHaveURL(/\/home$/);
    await expect(school).toBeFocused();
  });

  test("reduced motion swaps the door in one frame", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj !== "tablet-portrait" && proj !== "desktop", "tablet portrait and desktop");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/home");
    const door = page.getByRole("button", { name: "Open Hale Design Lab" });
    await page.evaluate(() => {
      const record = { swung: false };
      (window as unknown as { __door?: { swung: boolean } }).__door = record;
      const target = document.querySelector("[data-door-id='hale-design-lab']");
      if (!target) return;
      new MutationObserver(() => {
        const phase = target.getAttribute("data-phase");
        if (phase === "swing" || phase === "dolly") record.swung = true;
      }).observe(target, { attributes: true, attributeFilter: ["data-phase"] });
    });
    await door.click();
    await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
    await expect(page.locator(".room-portal")).toHaveCount(0);
    await expect(page.locator(".door.is-opening")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
    const swung = await page.evaluate(() => (window as unknown as { __door?: { swung: boolean } }).__door?.swung ?? false);
    expect(swung).toBe(false);

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.locator(".room-portal")).toHaveCount(0);
    await expect(door).toBeFocused();
    await expect(door).toHaveAttribute("data-phase", "closed");

    await page.getByRole("tab", { name: "School" }).click();
    await page.getByRole("button", { name: "Open Reading Room" }).click();
    await expect(page).toHaveURL(/\/learn\/reading-room$/);
    await expect(page.locator(".room-portal")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Ponder" })).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("button", { name: "Open Reading Room" })).toBeFocused();
  });

  test("grayscale hall keeps the door's light and shadow apart from the night", async ({ page }, info) => {
    test.skip(info.project.name !== "tablet-portrait", "one grayscale sheet");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/home");
    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    await expect(page.locator(".contact-shadow").first()).toBeVisible();
    await expect(page.locator(".foot-glow").first()).toBeVisible();
    await expect(page.locator(".jamb").first()).toBeVisible();
    const contrast = await page.locator(".door").first().evaluate((door) => {
      const canvas = door.querySelector(".frame canvas") as HTMLCanvasElement | null;
      const ctx = canvas?.getContext("2d");
      if (!ctx || !canvas) return 0;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let light = 0;
      let dark = 255;
      for (let i = 0; i < data.length; i += 16) {
        if ((data[i + 3] ?? 0) < 200) continue;
        const luma = 0.299 * (data[i] ?? 0) + 0.587 * (data[i + 1] ?? 0) + 0.114 * (data[i + 2] ?? 0);
        if (luma > light) light = luma;
        if (luma < dark) dark = luma;
      }
      return light - dark;
    });
    expect(contrast).toBeGreaterThan(40);
    await keep(page, "hall-grayscale-tablet-portrait");
  });
});
