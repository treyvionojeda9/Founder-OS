import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { founderEmber } from "../src/design/palette";

const shotDir = "../docs/screenshots/desk-drawer-ledger";
const artifactDir = "/opt/cursor/artifacts/screenshots/desk-drawer-ledger";
mkdirSync(shotDir, { recursive: true });
mkdirSync(artifactDir, { recursive: true });

function rgb(hex: string) {
  return `rgb(${Number.parseInt(hex.slice(1, 3), 16)}, ${Number.parseInt(hex.slice(3, 5), 16)}, ${Number.parseInt(hex.slice(5, 7), 16)})`;
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
  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".desk-drawer-pull")).toHaveCount(3);
  return page.locator(".desk-drawer-pull[data-agent='ceo']");
}

test.describe("desk drawer ledger", () => {
  test("opens a local paper list and stays in Founder Ember", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop shot");
    test.setTimeout(60_000);
    const writes: string[] = [];
    page.on("request", (req) => {
      if (req.method() !== "GET" && req.method() !== "HEAD") writes.push(req.url());
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const pull = await openOverview(page);

    await expect(page.locator(".desk-grid")).toHaveAttribute("data-drawer", "shut");
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-lighting", "ember");
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-space", "work");
    await expect(page.locator(".pipeline-rooms")).toBeVisible();
    await expect(page.getByRole("button", { name: /mail slot/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Library" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Team" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Desk tiles" })).toBeVisible();
    await expect(page.locator(".agent-desk .status-frame")).toHaveCount(3);
    await expect(pull).toHaveAttribute("data-pattern", "shut");
    await expect(pull).toHaveAttribute("data-frames", "1");
    await expect(pull).toHaveAttribute("data-placed", "true");
    expect(await pull.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe("solid");
    expect(await pull.evaluate((el) => getComputedStyle(el).borderTopColor)).toBe(rgb(founderEmber.wood));
    await keep(page, "closed");

    await pull.click();
    const list = page.getByRole("listbox", { name: "CEO work in progress" });
    await expect(list).toBeVisible();
    await expect(list).toHaveAttribute("data-lighting", "ember");
    await expect(list).toHaveAttribute("data-reach", "local");
    await expect(list).toHaveAttribute("data-frames", "1");
    await expect(list).toHaveAttribute("data-still", "true");
    await expect(list.locator(".desk-drawer-row")).toHaveCount(3);
    await expect(list.getByRole("option", { name: /Publish the forge note/ })).toHaveAttribute("data-status", "working");
    await expect(list.locator("[data-status='working'] .status-frame")).toHaveAttribute("data-glyph", "flame");
    await expect(list.locator("[data-status='working'] .status-frame")).toHaveAttribute("data-frames", "1");
    await expect(list.locator("[data-status='done'] .status-frame")).toHaveAttribute("data-glyph", "check");
    await expect(list.locator("[data-status='idle'] .status-frame")).toHaveAttribute("data-glyph", "rest");
    await expect(list).toContainText("Local fixture · not verified");
    expect(await list.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(rgb(founderEmber.paper));
    expect(await list.evaluate((el) => getComputedStyle(el).color)).toBe(rgb(founderEmber.night));
    expect(await list.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    await expect(page.getByRole("heading", { name: "CEO chat" })).toHaveCount(0);
    await expect(pull).toHaveAttribute("data-pattern", "pulled");
    expect(await pull.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe("dashed");
    await keep(page, "desktop-open");

    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    const shots = await Promise.all(
      ["working", "done", "idle"].map((status) =>
        list.locator(`.desk-drawer-row[data-status='${status}']`).screenshot({ animations: "disabled" }),
      ),
    );
    for (let i = 0; i < shots.length; i += 1) {
      for (let j = i + 1; j < shots.length; j += 1) expect(shots[i].equals(shots[j])).toBe(false);
    }
    await keep(page, "grayscale");
    await page.evaluate(() => {
      document.documentElement.style.filter = "";
    });

    await page.keyboard.press("Control+k");
    await expect(page.locator(".command-ledger")).toBeVisible();
    await expect(list).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".command-ledger")).toHaveCount(0);
    await expect(list).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(list).toHaveCount(0);
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-drawer", "shut");

    await pull.click();
    await page.getByRole("heading", { name: "Overview" }).click();
    await expect(page.locator(".desk-drawer")).toHaveCount(0);

    await page.locator(".desk-drawer-pull[data-agent='courier']").click();
    await page.getByRole("option", { name: /The lamp is out/ }).click();
    await expect(page.getByRole("heading", { name: "Courier chat" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.locator(".pipeline-rooms")).toBeVisible();

    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });
    expect(writes).toEqual([]);
  });

  test("tablet tap opens the atelier papers in one frame", async ({ page }, info) => {
    test.skip(info.project.name !== "tablet-portrait", "tablet shot");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openOverview(page);
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-arrange", "strip");
    const pull = page.locator(".desk-drawer-pull[data-agent='atelier']");
    await pull.tap();
    const list = page.getByRole("listbox", { name: "Atelier work in progress" });
    await expect(list).toBeVisible();
    await expect(list).toHaveAttribute("data-frames", "1");
    await expect(list.getByRole("option", { name: /File the swatch/ })).toBeVisible();
    await expect(page.locator(".pipeline-rooms")).toBeVisible();
    await expect(page.getByRole("button", { name: /mail slot/i })).toBeVisible();
    await keep(page, "tablet");
    await page.keyboard.press("Escape");
    await expect(list).toHaveCount(0);
    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });
  });

  test("motion uses two frames and reduced motion stays on one", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one motion check");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const moving = await openOverview(page);
    await moving.click();
    const open = page.getByRole("listbox", { name: "CEO work in progress" });
    await expect(open).toHaveAttribute("data-frames", "2");
    await expect(open).toHaveAttribute("data-still", "false");
    expect(await open.evaluate((el) => getComputedStyle(el).animationName)).toBe("drawer-sheet");
    await expect(open.locator("[data-status='working'] .status-frame")).toHaveAttribute("data-frames", "2");

    await page.emulateMedia({ reducedMotion: "reduce" });
    const still = await openOverview(page);
    await still.click();
    const quiet = page.getByRole("listbox", { name: "CEO work in progress" });
    await expect(quiet).toHaveAttribute("data-frames", "1");
    expect(await quiet.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    await expect(quiet.locator(".glyph-frame")).toHaveCount(3);
  });
});
