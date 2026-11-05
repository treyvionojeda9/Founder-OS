import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const pr5 = "../docs/screenshots/pr5";
mkdirSync(pr5, { recursive: true });
mkdirSync("/opt/cursor/artifacts/screenshots/pr5", { recursive: true });

async function keep(page: Page, name: string) {
  const path = `${pr5}/${name}.png`;
  await page.screenshot({ path, animations: "disabled" });
  copyFileSync(path, `/opt/cursor/artifacts/screenshots/pr5/${name}.png`);
}

async function keepClip(page: Page, locator: Locator, name: string) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`missing box for ${name}`);
  const path = `${pr5}/${name}.png`;
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
  copyFileSync(path, `/opt/cursor/artifacts/screenshots/pr5/${name}.png`);
}

async function clipHash(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("lamp box missing");
  const shot = await page.screenshot({
    animations: "disabled",
    clip: { x: box.x, y: box.y, width: box.width, height: box.height },
  });
  return createHash("sha256").update(shot).digest("hex");
}

function lamp(page: Page, status: "working" | "idle" | "failed") {
  return page.locator(`.agent-desk[data-status="${status}"] .agent-desk-lamp canvas`);
}

test.describe("overview desks", () => {
  test("shows every agent desk and opens a paper chat", async ({ page }, info) => {
    const proj = info.project.name;
    if (proj === "tablet-portrait") await page.setViewportSize({ width: 1000, height: 1600 });
    if (proj === "tablet-landscape") await page.setViewportSize({ width: 1600, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/team/hale-design-lab");
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-count", "3");
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-still", "true");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("button", { name: "CEO" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Atelier" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Courier" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Desk lamp, lit" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Desk lamp, dark" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Desk lamp, failed" })).toBeVisible();
    const layout = await page.locator(".app").getAttribute("data-layout");
    if (proj === "tablet-portrait") expect(layout).toBe("portrait");
    if (proj === "tablet-landscape") expect(layout).toBe("landscape");
    if (proj === "desktop") expect(layout).toBe("desktop");
    await keep(page, `overview-${proj}`);

    await page.getByRole("button", { name: "Atelier" }).click();
    await expect(page.getByRole("heading", { name: "Atelier chat" })).toBeVisible();
    await expect(page.locator(".machine-line").first()).toContainText("generated · not verified");
    await expect(page.getByRole("img", { name: "Desk lamp, dark" })).toBeVisible();
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "desk");
    if (proj === "tablet-portrait") await keep(page, "agent-chat-tablet-portrait");

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-count", "3");

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("button", { name: /Hale Design Lab/ })).toBeFocused();
  });
});

test("grayscale lamp on and lamp off stay different on the desk grid", async ({ page }, info) => {
  test.skip(info.project.name !== "tablet-portrait", "one grayscale sheet");
  await page.setViewportSize({ width: 1000, height: 1600 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/team/hale-design-lab");
  await page.getByRole("tab", { name: "Overview" }).click();
  await page.evaluate(() => {
    document.documentElement.style.filter = "grayscale(1)";
  });
  const lit = lamp(page, "working");
  const dark = lamp(page, "idle");
  const failed = lamp(page, "failed");
  await expect(lit).toBeVisible();
  await expect(dark).toBeVisible();
  const litHash = await clipHash(page, lit);
  const darkHash = await clipHash(page, dark);
  const failedHash = await clipHash(page, failed);
  expect(darkHash).not.toBe(litHash);
  expect(failedHash).not.toBe(litHash);
  expect(failedHash).not.toBe(darkHash);
  await keepClip(page, lit, "lamp-on-grayscale-tablet-portrait");
  await keepClip(page, dark, "lamp-off-grayscale-tablet-portrait");
  await keep(page, "overview-grayscale-tablet-portrait");
});

test("reduced motion cuts the desk open to one frame", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one cut");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/team/hale-design-lab");
  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page.locator(".desk-grid")).toHaveAttribute("data-still", "true");
  await page.getByRole("button", { name: "Courier" }).click();
  await expect(page.getByRole("heading", { name: "Courier chat" })).toBeVisible();
  await expect(page.locator(".agent-desk")).toHaveCount(0);
  expect(await page.locator(".study-stage").evaluate((el) => el.getAnimations().length)).toBe(0);
});

test("axe has no serious or critical issues on the desk grid", async ({ page }, info) => {
  test.skip(info.project.name !== "tablet-portrait", "one axe pass");
  await page.setViewportSize({ width: 1000, height: 1600 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/team/hale-design-lab");
  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  const overview = await new AxeBuilder({ page }).analyze();
  const overviewBad = overview.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  expect(overviewBad, JSON.stringify(overviewBad, null, 2)).toEqual([]);

  await page.getByRole("button", { name: "CEO" }).click();
  await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
  const chat = await new AxeBuilder({ page }).analyze();
  const chatBad = chat.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  expect(chatBad, JSON.stringify(chatBad, null, 2)).toEqual([]);
});
