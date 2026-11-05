import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ENTER_MS } from "../src/hall/doorMotion";

const pr4 = "../docs/screenshots/pr4";
mkdirSync(pr4, { recursive: true });
mkdirSync("/opt/cursor/artifacts/screenshots/pr4", { recursive: true });

async function keep(page: Page, name: string) {
  const path = `${pr4}/${name}.png`;
  await page.screenshot({ path, animations: "allow" });
  copyFileSync(path, `/opt/cursor/artifacts/screenshots/pr4/${name}.png`);
}

async function stageHash(page: Page) {
  const box = await page.locator(".study-stage").boundingBox();
  if (!box) throw new Error("study stage missing");
  const shot = await page.screenshot({
    animations: "disabled",
    clip: {
      x: Math.max(0, box.x),
      y: Math.max(0, box.y),
      width: Math.max(1, box.width),
      height: Math.max(1, box.height),
    },
  });
  return createHash("sha256").update(shot).digest("hex");
}

async function seek(page: Page, ms: number) {
  await page.evaluate((time) => {
    for (const animation of document.getAnimations()) {
      animation.pause();
      animation.currentTime = time;
    }
  }, ms);
}

test.describe("landed study", () => {
  test("work door lands with the paper on the desk", async ({ page }, info) => {
    const proj = info.project.name;
    if (proj === "tablet-portrait") await page.setViewportSize({ width: 1000, height: 1600 });
    if (proj === "tablet-landscape") await page.setViewportSize({ width: 1600, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/home");
    await page.getByRole("button", { name: /Hale Design Lab/ }).click();
    await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "desk");
    await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
    await expect(page.locator(".desk-top")).toBeVisible();
    await expect(page.locator(".floor-plane")).toBeVisible();
    await expect(page.locator(".back-wall")).toBeVisible();
    await expect(page.getByRole("img", { name: "CEO" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Desk lamp, lit" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Forge note" })).toBeVisible();
    const perspective = await page.locator(".study-stage").evaluate((el) => getComputedStyle(el).perspective);
    expect(perspective).not.toBe("none");
    const deskPlane = await page.locator(".desk-top").evaluate((el) => getComputedStyle(el).transform);
    const paperPlane = await page.locator(".paper-slot").evaluate((el) => getComputedStyle(el).transform);
    expect(deskPlane).not.toBe("none");
    expect(paperPlane).not.toBe("none");
    await keep(page, `room-desk-${proj}`);
  });

  test("the paper lifts and sets down", async ({ page }, info) => {
    test.skip(info.project.name === "tablet-landscape", "portrait tap and desktop keys");
    if (info.project.name === "tablet-portrait") await page.setViewportSize({ width: 1000, height: 1600 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/team/hale-design-lab");
    const slot = page.locator(".paper-slot");
    await expect(slot).toHaveAttribute("data-pose", "desk");
    const heading = page.getByRole("heading", { name: "CEO chat" });
    if (info.project.name === "tablet-portrait") await heading.tap();
    else await heading.click();
    await expect(slot).toHaveAttribute("data-pose", "lifted");
    if (info.project.name === "tablet-portrait") await keep(page, "paper-lifted-tablet-portrait");
    const setDown = page.getByRole("button", { name: "Set it down" });
    const box = await setDown.boundingBox();
    expect(box && box.width >= 48 && box.height >= 48).toBe(true);
    if (info.project.name === "tablet-portrait") await setDown.tap();
    else await setDown.click();
    await expect(slot).toHaveAttribute("data-pose", "desk");

    await page.getByRole("tabpanel").focus();
    await page.keyboard.press("Enter");
    await expect(slot).toHaveAttribute("data-pose", "lifted");
    await page.keyboard.press("Escape");
    await expect(slot).toHaveAttribute("data-pose", "desk");
    await page.getByRole("tabpanel").focus();
    await page.keyboard.press("Space");
    await expect(slot).toHaveAttribute("data-pose", "lifted");
    await page.keyboard.press("Escape");
    await expect(slot).toHaveAttribute("data-pose", "desk");
    await page.getByLabel("Message the CEO").focus();
    await expect(slot).toHaveAttribute("data-pose", "lifted");
  });
});

test("grayscale lamp and paper poses stay different", async ({ page }, info) => {
  test.skip(info.project.name !== "tablet-portrait", "one grayscale sheet");
  await page.setViewportSize({ width: 1000, height: 1600 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/team/hale-design-lab");
  await page.evaluate(() => {
    document.documentElement.style.filter = "grayscale(1)";
  });
  const lit = await page.getByRole("img", { name: /Desk lamp/ }).evaluate((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let sig = 0;
    for (let i = 0; i < data.length; i += 16) sig = (sig + data[i] * 3 + data[i + 1] * 5 + data[i + 2]) % 100000;
    return String(sig);
  });
  const desk = await stageHash(page);
  await keep(page, "room-grayscale-tablet-portrait");
  await page.getByRole("heading", { name: "CEO chat" }).tap();
  await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "lifted");
  const lifted = await stageHash(page);
  expect(lifted).not.toBe(desk);
  await keep(page, "paper-lifted-grayscale-tablet-portrait");
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Atelier" }).click();
  await expect(page.getByRole("img", { name: "Desk lamp, dark" })).toBeVisible();
  const dark = await page.getByRole("img", { name: /Desk lamp/ }).evaluate((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let sig = 0;
    for (let i = 0; i < data.length; i += 16) sig = (sig + data[i] * 3 + data[i + 1] * 5 + data[i + 2]) % 100000;
    return String(sig);
  });
  expect(dark).not.toBe(lit);
  const off = await stageHash(page);
  expect(off).not.toBe(desk);
  await keep(page, "room-grayscale-lamp-off-tablet-portrait");
});

test("school door opens into the learning desk", async ({ page }, info) => {
  test.skip(info.project.name !== "tablet-portrait", "one school sheet");
  await page.setViewportSize({ width: 1000, height: 1600 });
  await page.clock.install({ time: new Date("2026-10-29T12:00:00Z") });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/home");
  await page.getByRole("tab", { name: "School" }).click();
  await expect(page.getByRole("button", { name: /Reading Room/ })).toBeVisible();
  await page.clock.pauseAt(new Date("2026-10-29T12:00:03Z"));
  await page.getByRole("button", { name: /Reading Room/ }).click();
  await expect(page.locator(".room-portal .learn-room")).toBeVisible();
  await expect(page.locator(".room-portal .desk-top")).toBeVisible();
  const spillArea = await page.locator(".door.is-opening .spill").evaluate((el) => {
    const opacity = Number(getComputedStyle(el).opacity);
    const box = el.getBoundingClientRect();
    return opacity * box.width * box.height;
  });
  expect(spillArea).toBe(0);
  await seek(page, Math.round(ENTER_MS * 0.28));
  await expect(page).toHaveURL(/\/home$/);
  await keep(page, "school-door-mid-tablet-portrait");
  await page.clock.runFor(ENTER_MS + 500);
  await expect(page).toHaveURL(/\/learn\/reading-room$/);
  await expect(page.getByRole("heading", { name: "Ponder" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open the current path" })).toBeVisible();
  await expect(page.locator(".desk-apron")).toBeVisible();
  await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "desk");
  await expect(page.locator(".paper-glow")).toHaveCount(0);
  await keep(page, "school-landed-tablet-portrait");
});

test("reduced motion and slow updates cut the paper lift to one frame", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one cut");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/team/hale-design-lab");
  await expect(page.locator(".paper-slot")).toHaveAttribute("data-still", "true");
  await page.getByRole("heading", { name: "CEO chat" }).click();
  await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "lifted");
  expect(await page.locator(".paper-slot").evaluate((el) => el.getAnimations().length)).toBe(0);

  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => {
      if (query.includes("update") && query.includes("slow")) {
        return {
          matches: true,
          media: query,
          onchange: null,
          addListener: () => undefined,
          removeListener: () => undefined,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => false,
        } as MediaQueryList;
      }
      return original(query);
    };
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/team/hale-design-lab");
  await expect(page.locator(".paper-slot")).toHaveAttribute("data-still", "true");
  await page.locator(".paper-slot").evaluate((el) => el.getAnimations().forEach((animation) => animation.cancel()));
  await page.getByRole("heading", { name: "CEO chat" }).click();
  await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "lifted");
  await expect(page.locator(".paper-slot")).toHaveAttribute("data-still", "true");
});

test("axe has no serious or critical issues on the lifted paper", async ({ page }, info) => {
  test.skip(info.project.name !== "tablet-portrait", "one axe pass");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/team/hale-design-lab");
  await page.getByRole("heading", { name: "CEO chat" }).click();
  await expect(page.getByRole("button", { name: "Set it down" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);
});
