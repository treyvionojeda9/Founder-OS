import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const shotDir = "../docs/screenshots/tiled-desks";
const artifactDir = "/opt/cursor/artifacts/screenshots/tiled-desks";
mkdirSync(shotDir, { recursive: true });
mkdirSync(artifactDir, { recursive: true });

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
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/team/hale-design-lab");
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
}

test.describe("tiled desks", () => {
  test("desktop keeps 2 to 4 tiles, focuses, and still expands", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop tiles");
    const calls: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/api/") || url.includes("/notes") || url.includes("/tasks")) calls.push(url);
    });
    await openOverview(page);
    const grid = page.locator(".desk-grid");
    await expect(grid).toHaveAttribute("data-arrange", "tiles");
    await expect(grid).toHaveAttribute("data-tiles", "3");
    await expect(grid).toHaveAttribute("data-still", "true");
    await expect(grid).toHaveAttribute("data-focus", "none");
    await expect(page.locator(".agent-desk")).toHaveCount(3);
    await expect(page.locator(".study .status-frame")).toHaveCount(3);
    await expect(page.locator(".desk-stamp")).toHaveCount(3);
    await expect(page.locator(".lamp-chain")).toHaveCount(3);
    await expect(page.locator(".mail-slot")).toBeVisible();

    await page.getByRole("radio", { name: "2 tiles" }).click();
    await expect(grid).toHaveAttribute("data-tiles", "2");
    const tops = await page.locator(".agent-desk").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
    expect(Math.max(...tops) - Math.min(...tops)).toBeGreaterThan(8);
    await expect(page.locator(".tile-choice:has(input:checked)")).toHaveCSS("background-color", "rgb(210, 140, 64)");
    await page.reload();
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-tiles", "2");
    await keep(page, "desktop-2-tiles");

    await page.getByRole("radio", { name: "4 tiles" }).click();
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-tiles", "4");
    const row = await page.locator(".agent-desk").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
    expect(Math.max(...row) - Math.min(...row)).toBeLessThan(8);
    await keep(page, "desktop-4-tiles");

    await page.locator(".agent-desk[data-agent='atelier']").dblclick();
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-focus", "atelier");
    await expect(page.locator(".desk-grid-list > li[data-focused='true']")).toHaveCount(1);
    await expect(page.locator(".desk-grid-list > li[data-agent='ceo']")).toBeHidden();
    await expect(page.locator(".desk-grid-list > li[data-agent='courier']")).toBeHidden();
    await expect(page.locator(".desk-grid-list > li[data-agent='atelier']")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Atelier chat" })).toHaveCount(0);
    await expect(page.locator(".agent-desk[data-agent='atelier'] .status-frame")).toHaveAttribute("data-state", "idle");
    await expect(page.locator(".agent-desk[data-agent='atelier'] .desk-stamp")).toBeVisible();
    await expect(page.locator(".lamp-chain[data-agent='atelier']")).toBeVisible();
    expect(
      await page.locator(".agent-desk[data-focused='true'] .agent-desk-bay").evaluate((el) => el.getAnimations().length),
    ).toBe(0);
    await keep(page, "desktop-focused");

    await page.keyboard.press("Escape");
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-focus", "none");
    await expect(page.locator(".agent-desk[data-agent='atelier']")).toBeFocused();
    await expect(page.locator(".agent-desk")).toHaveCount(3);

    await page.locator(".agent-desk[data-agent='courier']").click();
    await expect(page.getByRole("heading", { name: "Courier chat" })).toBeVisible();
    await expect(page.locator(".overview-sheet")).toHaveAttribute("data-still", "true");
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-sheet", "open");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

    await page.getByRole("switch", { name: "Pause Atelier" }).click();
    await expect(page.locator(".lamp-chain[data-agent='atelier']")).toHaveAttribute("data-pattern", "pulled");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(calls).toEqual([]);
    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });

    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    await expect(page.locator(".agent-desk[data-agent='ceo'] .status-frame")).toHaveAttribute("data-pattern", "dash");
    await expect(page.locator(".agent-desk[data-agent='courier'] .status-frame")).toHaveAttribute("data-pattern", "crack");
    await expect(page.locator(".lamp-chain[data-agent='atelier']")).toHaveAttribute("data-pattern", "pulled");
    await keep(page, "grayscale");
  });

  test("tablet swipes a snap strip and still expands in place", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj === "desktop", "tablet strip");
    if (proj === "tablet-portrait") await page.setViewportSize({ width: 1000, height: 1600 });
    if (proj === "tablet-landscape") await page.setViewportSize({ width: 1600, height: 1000 });
    await openOverview(page);
    const grid = page.locator(".desk-grid");
    await expect(grid).toHaveAttribute("data-arrange", "strip");
    await expect(grid).toHaveAttribute("data-still", "true");
    await expect(page.locator(".desk-scroll")).toHaveAttribute("data-strip", "snap");
    await expect(page.getByRole("radio", { name: "2 tiles" })).toHaveCount(0);
    if (proj === "tablet-portrait") {
      const metrics = await page.locator(".desk-scroll").evaluate((el) => ({
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }));
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 8);
      const room = await page.locator(".desk-room").boundingBox();
      const desks = await page.locator(".overview-desk").evaluateAll((els) =>
        els.map((el) => {
          const box = el.getBoundingClientRect();
          return { top: box.top, bottom: box.bottom };
        }),
      );
      expect(desks.length).toBeGreaterThan(1);
      const span = Math.max(...desks.map((desk) => desk.bottom)) - Math.min(...desks.map((desk) => desk.top));
      expect(span).toBeGreaterThan((room?.height ?? 0) * 0.5);
      await keep(page, "tablet-strip");
    } else {
      const snap = await page.locator(".desk-scroll").evaluate((el) => getComputedStyle(el).scrollSnapType);
      expect(snap).toContain("x");
      expect(snap).toContain("mandatory");
      const metrics = await page.locator(".desk-scroll").evaluate((el) => {
        el.scrollLeft = 0;
        return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
      });
      expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth + 8);
      await page.locator(".desk-scroll").evaluate((el) => {
        el.scrollTo({ left: el.clientWidth, behavior: "auto" });
      });
      const left = await page.locator(".desk-scroll").evaluate((el) => el.scrollLeft);
      expect(left).toBeGreaterThan(8);
    }
    await expect(page.locator(".agent-desk[data-agent='ceo'] .status-frame")).toHaveAttribute("data-state", "working");
    await expect(page.locator(".agent-desk[data-agent='atelier'] .desk-stamp-task")).toHaveText("idle");
    await expect(page.locator(".lamp-chain")).toHaveCount(3);
    await expect(page.locator(".mail-slot")).toBeVisible();

    await page.locator(".agent-desk[data-agent='atelier'] .agent-desk-name").click();
    await expect(page.getByRole("heading", { name: "Atelier chat" })).toBeVisible();
    await expect(page.locator(".overview-sheet")).toBeVisible();
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-focus", "none");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

    await page.getByRole("switch", { name: "Pause CEO" }).click();
    await expect(page.locator(".agent-desk[data-agent='ceo']")).toHaveAttribute("data-paused", "true");
    await expect(page.locator(".agent-desk[data-agent='ceo'] .status-frame")).toHaveAttribute("data-state", "working");
    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });
  });
});
