import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { founderEmber } from "../src/design/palette";

const shotDir = "../docs/screenshots/chrome-recedes";
const artifactDir = "/opt/cursor/artifacts/screenshots/chrome-recedes";
mkdirSync(shotDir, { recursive: true });
mkdirSync(artifactDir, { recursive: true });

const night = "rgb(27, 26, 36)";
const darkwood = "rgb(79, 53, 46)";
const paper = "rgb(233, 223, 199)";

function luma(hex: string) {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
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

async function openOverview(page: Page) {
  await page.goto("/team/hale-design-lab");
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.locator(".mail-mouth")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-recede", "full");
}

async function barPoint(page: Page) {
  const box = await page.locator(".pixel-bar").boundingBox();
  if (!box) throw new Error("top chrome missing");
  return { x: box.x + Math.min(24, box.width / 2), y: box.y + Math.min(12, box.height / 2) };
}

async function roomPoint(page: Page) {
  const legend = page.locator(".overview-legend");
  const box = await legend.boundingBox();
  if (!box) throw new Error("room missing");
  return { x: box.x + 8, y: box.y + Math.min(8, box.height / 2) };
}

test.describe("chrome recedes", () => {
  test("desktop pointer-out dims the bar and pointer-in restores it in two frames", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop pointer");
    test.setTimeout(90_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openOverview(page);
    const before = await vaultCounts(page);
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-chrome-input", "pointer");
    await expect(html).toHaveAttribute("data-chrome-frames", "1");
    await expect(page.locator(".pixel-bar")).toHaveCSS("background-color", darkwood);
    await expect(page.locator(".pixel-bar")).toHaveCSS("transition-duration", "0s");
    await keep(page, "desktop-full");

    const onBar = await barPoint(page);
    const onRoom = await roomPoint(page);
    await page.mouse.move(onBar.x, onBar.y);
    await page.mouse.move(onRoom.x, onRoom.y);
    await page.waitForTimeout(280);
    await expect(html).toHaveAttribute("data-recede", "full");
    await expect(html).toHaveAttribute("data-recede", "dim", { timeout: 400 });
    await expect(page.locator(".pixel-bar")).toHaveCSS("background-color", night);
    await expect(page.locator(".pixel-bar")).toHaveCSS("box-shadow", "none");
    await expect(page.locator(".pixel-bar .study-team")).toHaveCSS("outline-style", "solid");
    await expect(page.locator(".pixel-bar .study-team")).toHaveCSS("outline-color", paper);
    await expect(page.locator(".pixel-bar button").first()).toHaveCSS("outline-style", "solid");
    await expect(page.locator(".mail-mouth")).toBeVisible();
    await expect(page.locator(".mail-mouth")).toHaveAttribute("data-discoverable", "mouth");
    await expect(page.locator(".mail-mouth")).toHaveCSS("opacity", "1");
    await expect(page.getByText("Needs you").first()).toBeVisible();
    await keep(page, "desktop-dim");

    const started = Date.now();
    await page.mouse.move(onBar.x, onBar.y);
    await expect(html).toHaveAttribute("data-recede", "full");
    expect(Date.now() - started).toBeLessThan(500);
    await expect(page.locator(".pixel-bar")).toHaveCSS("background-color", darkwood);
    expect(await vaultCounts(page)).toEqual(before);

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(html).toHaveAttribute("data-chrome-frames", "2");
    await expect(html).toHaveAttribute("data-recede", "full");
    const restore = await page.locator(".pixel-bar").evaluate((el) => {
      const style = getComputedStyle(el);
      return { duration: style.transitionDuration, timing: style.transitionTimingFunction };
    });
    expect(restore.duration.split(",")[0]?.trim()).toMatch(/^(0\.032s|32ms)$/);
    expect(restore.timing).toContain("steps(2");

    await page.mouse.move(onRoom.x, onRoom.y);
    await expect(html).toHaveAttribute("data-recede", "dim", { timeout: 800 });
    const dimmed = await page.locator(".pixel-bar").evaluate((el) => {
      const style = getComputedStyle(el);
      return { duration: style.transitionDuration, timing: style.transitionTimingFunction };
    });
    expect(dimmed.duration.split(",")[0]?.trim()).toMatch(/^(0\.16s|160ms)$/);
    expect(dimmed.timing).toContain("steps(4");
    await page.mouse.move(onBar.x, onBar.y);
    await expect(html).toHaveAttribute("data-recede", "full");
  });

  test("grayscale still shows the dimmed labels by outline", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one grayscale pass");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      const paint = () => {
        document.documentElement.style.filter = "grayscale(1)";
      };
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paint);
      paint();
    });
    await openOverview(page);
    await expect(page.locator("html")).toHaveAttribute("data-chrome-frames", "1");
    const onBar = await barPoint(page);
    const onRoom = await roomPoint(page);
    await page.mouse.move(onBar.x, onBar.y);
    await page.mouse.move(onRoom.x, onRoom.y);
    await expect(page.locator("html")).toHaveAttribute("data-recede", "dim", { timeout: 800 });
    const label = page.locator(".pixel-bar button").first();
    await expect(label).toHaveCSS("outline-style", "solid");
    await expect(label).toHaveCSS("color", paper);
    await expect(label).toHaveCSS("background-color", night);
    expect(luma(founderEmber.paper) - luma(founderEmber.night)).toBeGreaterThanOrEqual(80);
    await expect(page.locator(".mail-mouth")).toBeVisible();
    await expect(page.locator(".mail-caption")).toBeVisible();
    await keep(page, "grayscale");
  });

  test("tablet tap-out dims the bar, a chrome tap restores it, and the flame still opens the ledger", async ({ page }, info) => {
    test.skip(info.project.name !== "tablet-portrait" && info.project.name !== "tablet-landscape", "tablet tap");
    test.setTimeout(90_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openOverview(page);
    const before = await vaultCounts(page);
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-chrome-input", "tap");
    await expect(html).toHaveAttribute("data-chrome-frames", "1");
    await expect(page.locator(".pixel-bar")).toHaveCSS("transition-duration", "0s");

    await page.locator(".overview-legend").click();
    await expect(html).toHaveAttribute("data-recede", "dim");
    await expect(page.locator(".pixel-bar")).toHaveCSS("background-color", night);
    await expect(page.locator(".mail-mouth")).toBeVisible();
    await expect(page.locator(".mail-mouth")).toHaveCSS("opacity", "1");
    await expect(page.locator(".mail-caption")).toContainText("Needs you");
    if (info.project.name === "tablet-portrait") await keep(page, "tablet-dim");

    await page.getByRole("button", { name: "Library" }).click();
    await expect(html).toHaveAttribute("data-recede", "full");
    await expect(page.locator(".pixel-bar")).toHaveCSS("background-color", darkwood);
    await expect(page.locator(".library-room")).toBeVisible();

    await page.goto("/home");
    await expect(page.getByRole("tab", { name: "Work" })).toBeVisible();
    await expect(html).toHaveAttribute("data-recede", "full");
    const spot = await page.evaluate(() => {
      const wrap = document.querySelector(".door-wrap");
      if (!wrap) return null;
      const rect = wrap.getBoundingClientRect();
      for (let y = rect.top + 2; y < rect.bottom; y += 10) {
        for (let x = rect.left + 2; x < rect.right; x += 10) {
          const hit = document.elementFromPoint(x, y);
          if (!hit) continue;
          if (hit.closest(".pixel-bar, .toggle-dock, .door, .spark-flame, a, button")) continue;
          if (hit.closest(".hall, .stage, .door-wrap")) return { x, y };
        }
      }
      return null;
    });
    expect(spot).not.toBeNull();
    await page.mouse.click(spot!.x, spot!.y);
    await expect(html).toHaveAttribute("data-recede", "dim");

    const flame = page.locator(".compact-brand [data-flame='spark']");
    await expect(flame).toBeVisible();
    await flame.dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 1, bubbles: true });
    await expect(page.getByRole("dialog", { name: "Command ledger" })).toBeVisible({ timeout: 1_000 });
    await expect(page.locator(".command-ledger")).toHaveAttribute("data-room", "work");
    expect(await html.getAttribute("data-recede")).toBe("dim");
    await flame.dispatchEvent("pointerup", { pointerType: "touch", pointerId: 1, bubbles: true });
    await expect(page.getByRole("dialog", { name: "Command ledger" })).toBeVisible();
    expect(await html.getAttribute("data-recede")).toBe("full");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Command ledger" })).toHaveCount(0);
    await page.getByRole("tab", { name: "School" }).click();
    await expect(page.getByRole("tab", { name: "School" })).toHaveAttribute("aria-selected", "true");
    expect(await vaultCounts(page)).toEqual(before);
  });
});
