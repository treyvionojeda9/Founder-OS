import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const shotDir = "../docs/screenshots/goto-ledger";
const artifactDir = "/opt/cursor/artifacts/screenshots/goto-ledger";
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

async function paintGray(page: Page) {
  await page.addInitScript(() => {
    const paint = () => {
      document.documentElement.style.filter = "grayscale(1)";
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paint);
    paint();
  });
}

test.describe("go-to chords and command ledger", () => {
  test("desktop chords, ranked ledger, and grayscale stay off the vault", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop shots");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/home");
    await page.evaluate(() => document.fonts.ready);
    const before = await vaultCounts(page);

    await page.keyboard.press("g");
    await expect(page.locator("html")).toHaveAttribute("data-chord", "armed");
    await page.waitForTimeout(900);
    await expect(page.locator("html")).toHaveAttribute("data-chord", "idle");
    await page.keyboard.press("s");
    await expect(page.getByRole("tab", { name: "Work" })).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("g");
    await page.keyboard.press("s");
    await expect(page.getByRole("tab", { name: "School" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("button", { name: "Open Reading Room" })).toBeVisible();

    await page.keyboard.press("g");
    await page.keyboard.press("w");
    await expect(page.getByRole("tab", { name: "Work" })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("option").first()).toContainText("Open Hale Design Lab");
    await expect(page.locator(".command-ledger")).toHaveAttribute("data-room", "work");
    await keep(page, "desktop");
    await page.keyboard.press("Escape");

    await page.keyboard.press("g");
    await page.keyboard.press("o");
    await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.locator("[data-place='overview']")).toBeVisible();

    await page.keyboard.press("Control+k");
    const ledger = page.getByRole("dialog", { name: "Command ledger" });
    await expect(ledger).toBeVisible();
    await expect(ledger).toHaveAttribute("data-room", "overview");
    await expect(ledger).toHaveAttribute("data-still", "true");
    await expect(ledger).toHaveAttribute("data-frames", "1");
    expect(await page.locator(".ledger-sheet").evaluate((el) => el.getAnimations().length)).toBe(0);
    await expect(page.getByRole("option").first()).toHaveAttribute("data-group", "room");
    await expect(page.getByRole("option").first()).toContainText("Open the mail slot");
    const groups = await page.getByRole("option").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-group")));
    const split = groups.indexOf("anywhere");
    expect(split).toBeGreaterThan(0);
    expect(groups.slice(0, split).every((group) => group === "room")).toBe(true);
    expect(groups.slice(split).every((group) => group === "anywhere")).toBe(true);
    await keep(page, "ranked-by-room");

    await page.keyboard.press("Escape");
    await expect(ledger).toHaveCount(0);

    await page.getByRole("tab", { name: "CEO" }).click();
    const composer = page.getByLabel("Message the CEO");
    await composer.click();
    await composer.fill("go to school");
    await expect(composer).toHaveValue("go to school");
    await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
    await expect(page).toHaveURL(/\/team\/hale-design-lab$/);

    await composer.blur();
    await page.keyboard.press("g");
    await page.keyboard.press("l");
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
    await page.keyboard.press("Control+k");
    await expect(page.locator(".command-ledger")).toHaveAttribute("data-room", "library");
    await expect(page.getByRole("option").first()).toContainText("Place a sheet");
    await expect(page.getByRole("option", { name: /Save this note/ })).toHaveCount(0);
    await expect(page.getByRole("option", { name: /Approve/ })).toHaveCount(0);
    await page.keyboard.press("Escape");

    expect(await vaultCounts(page)).toEqual(before);
    expect(before).toEqual({ human: 0, machine: 0 });
  });

  test("grayscale ledger keeps the active mark", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop grayscale");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await paintGray(page);
    await page.goto("/team/hale-design-lab");
    await page.getByRole("tab", { name: "Overview" }).click();
    await page.keyboard.press("Control+k");
    const ledger = page.getByRole("dialog", { name: "Command ledger" });
    await expect(ledger).toBeVisible();
    await expect(page.locator(".ledger-option[data-pattern='mark']")).toHaveCount(1);
    await keep(page, "grayscale");
  });

  test("tablet long-press on the flame opens the ledger", async ({ page }, info) => {
    test.skip(info.project.name !== "tablet-portrait", "tablet flame");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/home");
    await page.evaluate(() => document.fonts.ready);
    const before = await vaultCounts(page);
    const flame = page.locator(".compact-brand [data-flame='spark']");
    await expect(flame).toBeVisible();
    await expect(page.locator(".fab, [data-fab]")).toHaveCount(0);
    await flame.dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 1, bubbles: true });
    await page.waitForTimeout(520);
    await expect(page.getByRole("dialog", { name: "Command ledger" })).toBeVisible();
    await expect(page.locator(".command-ledger")).toHaveAttribute("data-room", "work");
    await expect(page.getByRole("option").first()).toContainText("Open Hale Design Lab");
    await expect(page.locator(".command-ledger")).toHaveAttribute("data-frames", "1");
    await flame.dispatchEvent("pointerup", { pointerType: "touch", pointerId: 1, bubbles: true });
    await keep(page, "tablet");
    expect(await vaultCounts(page)).toEqual(before);
  });
});
