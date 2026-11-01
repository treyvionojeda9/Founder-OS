import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { founderEmber, schoolAccent } from "../src/design/palette";

const shotDir = "../docs/screenshots/school-path-map";
const artifactDir = "/opt/cursor/artifacts/screenshots/school-path-map";
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

async function openMap(page: Page) {
  await page.goto("/learn/reading-room");
  await expect(page.locator(".learn-room")).toHaveAttribute("data-ready", "true");
  await expect(page.getByRole("heading", { name: "Ponder" })).toBeVisible();
  const book = page.getByRole("button", { name: "Open the current path" });
  await book.click();
  const dialog = page.getByRole("dialog", { name: "Reading Room path" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".path-map")).toBeVisible();
  return dialog;
}

test.describe("school path map", () => {
  test("desktop map, focus ring, and a station sheet", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop shot");
    test.setTimeout(60_000);
    const writes: string[] = [];
    page.on("request", (req) => {
      if (req.method() !== "GET" && req.method() !== "HEAD") writes.push(req.url());
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const dialog = await openMap(page);
    const map = dialog.locator(".path-map");
    await expect(map).toHaveAttribute("data-frames", "1");
    await expect(map).toHaveAttribute("data-still", "true");
    await expect(map).toHaveAttribute("data-focus", "task-one-page");
    await expect(map.locator(".path-node")).toHaveCount(4);
    await expect(map.locator(".path-link")).toHaveCount(3);
    await expect(dialog.getByText("A fixture. No course is loaded.")).toBeVisible();
    await expect(page.locator(".paper-log")).toBeVisible();

    const focus = map.locator('.path-node[data-pattern="double"]');
    const done = map.locator('.path-node[data-pattern="corners"]');
    const locked = map.locator('.path-node[data-pattern="dotted"]').first();
    await expect(focus).toHaveAttribute("aria-current", "step");
    const focusShadow = await focus.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(focusShadow).toContain("inset");
    expect(focusShadow).toContain(rgb(founderEmber.paper));
    expect(focusShadow).toContain(rgb(founderEmber.night));
    expect(await done.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe("solid");
    expect(await done.evaluate((el) => getComputedStyle(el).borderTopColor)).toBe("rgba(0, 0, 0, 0)");
    expect(await locked.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe("dotted");
    const ink = await map.locator(".path-thread-ink").first().evaluate((el) => getComputedStyle(el).stroke);
    const ember = await map.locator(".path-thread-ember").first().evaluate((el) => getComputedStyle(el).stroke);
    expect(ink).toBe(rgb(schoolAccent.ink));
    expect(ember).toBe(rgb(founderEmber.ember));
    expect(await map.locator(".path-thread").evaluateAll((els) => els.every((el) => el.getAnimations().length === 0))).toBe(
      true,
    );
    expect(await focus.evaluate((el) => el.getAnimations().length)).toBe(0);

    await keep(page, "desktop");
    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    const focusShot = await focus.screenshot({ animations: "disabled" });
    const doneShot = await done.screenshot({ animations: "disabled" });
    expect(Buffer.compare(focusShot, doneShot)).not.toBe(0);
    await keep(page, "grayscale");
    await page.evaluate(() => {
      document.documentElement.style.filter = "";
    });

    await focus.click();
    const sheet = dialog.getByRole("region", { name: "Sit with one page" });
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText("Mark a sentence you want to remember. This task is a fixture.");
    await expect(sheet.locator("textarea, form")).toHaveCount(0);
    await keep(page, "node-open");
    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });
    expect(writes).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(focus).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open the current path" })).toBeFocused();
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "desk");
  });

  test("tablet map keeps the ponder desk behind the book", async ({ page }, info) => {
    test.skip(info.project.name !== "tablet-portrait", "tablet shot");
    await page.emulateMedia({ reducedMotion: "reduce" });
    const dialog = await openMap(page);
    await expect(dialog.locator(".path-node")).toHaveCount(4);
    await expect(page.locator(".book-prop")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ponder" })).toBeVisible();
    await dialog.getByRole("button", { name: "Later Margin key" }).tap();
    await expect(dialog.getByRole("region", { name: "Margin key" })).toContainText(
      "Write that sentence in your own words.",
    );
    await dialog.getByRole("button", { name: "Set the sheet down" }).tap();
    await expect(dialog.getByRole("region", { name: "Margin key" })).toHaveCount(0);
    await keep(page, "tablet");
    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });
  });

  test("motion uses two highlight frames and reduced motion stays on one", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one motion check");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const moving = await openMap(page);
    await expect(moving.locator(".path-map")).toHaveAttribute("data-frames", "2");
    await expect(moving.locator(".path-map")).toHaveAttribute("data-still", "false");
    expect(await moving.locator(".path-thread-ember").first().evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
    expect(
      await moving.locator('.path-node[data-pattern="double"]').evaluate((el) => el.getAnimations().length),
    ).toBeGreaterThan(0);
    await page.keyboard.press("Escape");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    const still = await openMap(page);
    await expect(still.locator(".path-map")).toHaveAttribute("data-frames", "1");
    expect(
      await still.locator(".path-thread, .path-node").evaluateAll((els) => els.every((el) => el.getAnimations().length === 0)),
    ).toBe(true);
  });
});
