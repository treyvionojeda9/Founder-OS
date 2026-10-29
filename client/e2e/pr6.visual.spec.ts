import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ENTER_MS, SHUT_MS } from "../src/hall/doorMotion";

const pr6 = "../docs/screenshots/pr6";
mkdirSync(pr6, { recursive: true });
mkdirSync("/opt/cursor/artifacts/screenshots/pr6", { recursive: true });

async function keep(page: Page, name: string) {
  const path = `${pr6}/${name}.png`;
  await page.screenshot({ path, animations: "allow" });
  copyFileSync(path, `/opt/cursor/artifacts/screenshots/pr6/${name}.png`);
}

async function seek(page: Page, ms: number) {
  await page.evaluate((time) => {
    for (const animation of document.getAnimations()) {
      animation.pause();
      animation.currentTime = time;
    }
  }, ms);
}

async function land(page: Page, project: string) {
  if (project === "tablet-portrait") await page.setViewportSize({ width: 1000, height: 1600 });
  if (project === "tablet-landscape") await page.setViewportSize({ width: 1600, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn/reading-room");
  await expect(page.locator(".learn-room")).toHaveAttribute("data-ready", "true");
  await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "desk");
}

test.describe("school learning desk", () => {
  test("lands a perspective desk with a sheet, a book, and a key", async ({ page }, info) => {
    const proj = info.project.name;
    await land(page, proj);
    await expect(page.getByRole("heading", { name: "Ponder" })).toBeVisible();
    await expect(page.locator(".desk-top")).toBeVisible();
    await expect(page.locator(".desk-apron")).toBeVisible();
    await expect(page.locator(".apron-rail")).toBeVisible();
    await expect(page.locator(".floor-plane")).toBeVisible();
    await expect(page.locator(".back-wall")).toBeVisible();
    await expect(page.getByRole("img", { name: "Desk lamp, lit" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Assignment key" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open the current path" })).toBeVisible();
    await expect(page.locator(".desk-pool")).toHaveAttribute("data-pool-palette", "ember");
    const perspective = await page.locator(".study-stage").evaluate((el) => getComputedStyle(el).perspective);
    expect(perspective).not.toBe("none");
    const deskPlane = await page.locator(".desk-top").evaluate((el) => getComputedStyle(el).transform);
    const paperPlane = await page.locator(".paper-slot").evaluate((el) => getComputedStyle(el).transform);
    expect(deskPlane).not.toBe("none");
    expect(paperPlane).not.toBe("none");
    await keep(page, `learn-desk-${proj}`);
  });

  test("lifts the sheet, sets it down, and leaves the vault until the person keeps it", async ({ page }, info) => {
    const proj = info.project.name;
    await land(page, proj);
    const slot = page.locator(".paper-slot");
    const heading = page.getByRole("heading", { name: "Ponder" });
    if (proj === "tablet-portrait") await heading.tap();
    else await heading.click();
    await expect(slot).toHaveAttribute("data-pose", "lifted");
    await expect(page.getByRole("textbox", { name: "Your note" })).toBeVisible();
    const setDown = page.getByRole("button", { name: "Set it down" });
    const box = await setDown.boundingBox();
    expect(box && box.width >= 48 && box.height >= 48).toBe(true);
    if (proj === "tablet-portrait") await keep(page, "learn-lifted-tablet-portrait");
    if (proj === "tablet-landscape") await keep(page, "learn-lifted-tablet-landscape");
    if (proj === "desktop") await keep(page, "learn-lifted-desktop");
    await page.getByRole("textbox", { name: "Your note" }).fill("A line left on the sheet.");
    if (proj === "tablet-portrait") await setDown.tap();
    else await setDown.click();
    await expect(slot).toHaveAttribute("data-pose", "desk");
    await expect(page.getByText("A line left on the sheet.")).toBeVisible();

    await page.getByLabel("Ponder").focus();
    await page.keyboard.press("Enter");
    await expect(slot).toHaveAttribute("data-pose", "lifted");
    await page.keyboard.press("Escape");
    await expect(slot).toHaveAttribute("data-pose", "desk");
    await page.getByLabel("Ponder").focus();
    await page.keyboard.press("Space");
    await expect(slot).toHaveAttribute("data-pose", "lifted");
    await page.keyboard.press("Escape");
    await expect(slot).toHaveAttribute("data-pose", "desk");

    if (proj === "tablet-portrait") await heading.tap();
    else await heading.click();
    await page.getByRole("button", { name: "Keep this note" }).click();
    await expect(page.getByRole("status")).toHaveText("Kept with your notes.");
  });

  test("the book opens the fixture path", async ({ page }, info) => {
    const proj = info.project.name;
    await land(page, proj);
    const book = page.getByRole("button", { name: "Open the current path" });
    const bookBox = await book.boundingBox();
    expect(bookBox && bookBox.width >= 48 && bookBox.height >= 48).toBe(true);
    if (proj === "tablet-portrait") await book.tap();
    else await book.click();
    const dialog = page.getByRole("dialog", { name: "Reading Room path" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Sit with one page");
    await expect(dialog).toContainText("A fixture. No course is loaded.");
    await expect(dialog).toContainText("Margin key");
    await expect(dialog).toContainText("Write that sentence in your own words.");
    if (proj === "tablet-portrait") await keep(page, "learn-book-tablet-portrait");
    if (proj === "tablet-landscape") await keep(page, "learn-book-tablet-landscape");
    if (proj === "desktop") await keep(page, "learn-book-desktop");
    await page.getByRole("button", { name: "Close the book" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "desk");
  });

  test("Back returns through the School door to the hall", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj === "desktop-video", "visual projects only");
    await page.clock.install({ time: new Date("2026-10-29T18:00:00Z") });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    if (proj === "tablet-portrait") await page.setViewportSize({ width: 1000, height: 1600 });
    if (proj === "tablet-landscape") await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto("/home");
    await page.clock.pauseAt(new Date("2026-10-29T18:00:03Z"));
    await page.getByRole("tab", { name: "School" }).click();
    await page.getByRole("button", { name: /Reading Room/ }).click();
    await page.clock.runFor(ENTER_MS + 500);
    await expect(page).toHaveURL(/\/learn\/reading-room$/);
    await expect(page.getByRole("heading", { name: "Ponder" })).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.locator(".room-portal.is-shut")).toBeVisible();
    await expect(page.locator(".room-portal .learn-room")).toBeVisible();
    if (proj === "tablet-portrait") {
      await seek(page, Math.round(SHUT_MS * 0.45));
      await keep(page, "learn-back-mid-tablet-portrait");
    }
    await page.clock.runFor(SHUT_MS + 300);
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("button", { name: /Reading Room/ })).toBeFocused();
    if (proj === "tablet-landscape") await keep(page, "learn-hall-tablet-landscape");
    if (proj === "desktop") await keep(page, "learn-hall-desktop");
  });
});

test("field notes has a path and no assignment key", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one desk without a key");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn/field-notes");
  await expect(page.locator(".learn-room")).toHaveAttribute("data-assignment", "false");
  await expect(page.getByRole("img", { name: "Assignment key" })).toHaveCount(0);
  await page.getByRole("button", { name: "Open the current path" }).click();
  const dialog = page.getByRole("dialog", { name: "Field Notes path" });
  await expect(dialog).toContainText("Name one thing you noticed");
  await expect(dialog).toContainText("No assignment on this desk.");
  await keep(page, "learn-field-notes-desktop");
});

test("grayscale desk, lift, and book stay distinct", async ({ page }, info) => {
  test.skip(info.project.name !== "tablet-portrait", "one grayscale sheet");
  await page.setViewportSize({ width: 1000, height: 1600 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn/reading-room");
  await page.evaluate(() => {
    document.documentElement.style.filter = "grayscale(1)";
  });
  await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "desk");
  const desk = await page.locator(".study-stage").screenshot({ animations: "disabled" });
  await keep(page, "learn-grayscale-tablet-portrait");
  await page.getByRole("heading", { name: "Ponder" }).tap();
  await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "lifted");
  const lifted = await page.locator(".study-stage").screenshot({ animations: "disabled" });
  expect(Buffer.compare(desk, lifted)).not.toBe(0);
  await keep(page, "learn-lifted-grayscale-tablet-portrait");
});

test("reduced motion cuts the school lift to one frame", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one cut");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn/reading-room");
  await expect(page.locator(".paper-slot")).toHaveAttribute("data-still", "true");
  await page.getByRole("heading", { name: "Ponder" }).click();
  await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "lifted");
  expect(await page.locator(".paper-slot").evaluate((el) => el.getAnimations().length)).toBe(0);
});

test("axe has no serious or critical issues on the lifted note or the path", async ({ page }, info) => {
  test.skip(info.project.name !== "tablet-portrait", "one axe pass");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn/reading-room");
  await page.getByRole("heading", { name: "Ponder" }).click();
  await expect(page.getByRole("button", { name: "Set it down" })).toBeVisible();
  const lifted = await new AxeBuilder({ page }).analyze();
  const liftedBad = lifted.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  expect(liftedBad, JSON.stringify(liftedBad, null, 2)).toEqual([]);
  await page.getByRole("button", { name: "Set it down" }).click();
  await page.getByRole("button", { name: "Open the current path" }).click();
  await expect(page.getByRole("dialog", { name: "Reading Room path" })).toBeVisible();
  const book = await new AxeBuilder({ page }).analyze();
  const bookBad = book.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  expect(bookBad, JSON.stringify(bookBad, null, 2)).toEqual([]);
});
