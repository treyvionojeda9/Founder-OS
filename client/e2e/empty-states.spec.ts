import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const shotDir = "../docs/screenshots/empty-states";
const artifactDir = "/opt/cursor/artifacts/screenshots/empty-states";
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

test.describe("empty states as objects", () => {
  test("empty desk opens the team swap slip and leaves the vault alone", async ({ page }, info) => {
    test.skip(info.project.name === "desktop-video", "visual projects only");
    const calls: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/api/") || url.includes("/notes") || url.includes("/tasks")) calls.push(url);
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/team/quiet-bench");
    await page.evaluate(() => document.fonts.ready);
    const grid = page.locator(".desk-grid");
    await expect(grid).toHaveAttribute("data-empty", "true");
    await expect(grid).toHaveAttribute("data-count", "0");
    await expect(grid).toHaveAttribute("data-still", "true");
    const card = page.locator(".empty-desk");
    await expect(card).toHaveAttribute("data-frames", "1");
    await expect(card).toHaveAttribute("data-object", "empty-desk");
    await expect(card.locator(".empty-desk-plaque")).toHaveAttribute("data-label", "pixel");
    await expect(card.locator(".empty-desk-plaque")).toHaveAttribute("data-plaque", "engraved");
    await expect(card.locator(".empty-desk-seat")).toHaveAttribute("data-pattern", "dashed");
    await expect(page.getByText("This desk is empty.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Seat an agent" })).toBeVisible();
    await expect(page.locator(".mail-slot")).toBeVisible();
    await expect(page.locator(".agent-desk")).toHaveCount(0);
    expect(await card.evaluate((el) => el.getAnimations().length)).toBe(0);
    await expect(page.getByRole("button", { name: "Seat an agent" })).toHaveCSS("background-color", "rgb(210, 140, 64)");
    expect(calls).toEqual([]);
    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });

    if (info.project.name === "desktop") await keep(page, "desktop-empty-desk");
    if (info.project.name === "tablet-portrait") await keep(page, "tablet");

    await page.getByRole("button", { name: "Seat an agent" }).click();
    const dialog = page.getByRole("dialog", { name: "Swap seat" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("data-overlay", "swap");
    await expect(dialog).toHaveAttribute("data-frames", "1");
    await expect(dialog).toHaveAttribute("data-still", "true");
    await expect(page.getByText("No other seat on this board.")).toBeVisible();
    expect(await dialog.evaluate((el) => el.getAnimations().length)).toBe(0);
    expect(calls).toEqual([]);
    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });
    await page.getByRole("button", { name: "Set it aside" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
    await expect(page.locator(".tools-dock")).toBeVisible();

    if (info.project.name !== "desktop") return;

    await page.goto("/team/hale-design-lab");
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-empty", "false");
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-arrange", "tiles");
    await expect(page.locator(".agent-desk")).toHaveCount(3);
    await expect(page.locator(".status-frame")).toHaveCount(3);
    await expect(page.locator(".mail-slot")).toBeVisible();
    await page.getByRole("radio", { name: "4 tiles" }).click();
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-tiles", "4");
    await page.keyboard.press("Control+k");
    await expect(page.locator(".command-ledger")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".command-ledger")).toHaveCount(0);
    await page.getByRole("button", { name: "Library" }).click();
    await expect(page.locator(".library-room")).toHaveAttribute("data-ready", "true");
    await expect(page.locator(".shelf-bay")).toHaveCount(3);
    await page.getByRole("button", { name: "Team" }).click();
    await expect(page.getByRole("button", { name: "Swap seat" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit agent" }).first()).toBeVisible();
    await expect(page.locator(".brass-pin").first()).toBeVisible();
    expect(calls).toEqual([]);
    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });
  });

  test("empty shelf is dust plus one human action", async ({ page }, info) => {
    test.skip(info.project.name === "desktop-video" || info.project.name === "tablet-landscape", "desktop and tablet portrait");
    const calls: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/api/") || url.includes("/notes") || url.includes("/tasks")) calls.push(url);
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/team/hale-design-lab");
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole("button", { name: "Library" }).click();
    await expect(page.locator(".library-room")).toHaveAttribute("data-ready", "true");
    await expect(page.locator(".library-room")).toHaveAttribute("data-vault", "human");
    await expect(page.locator(".library-room")).toHaveAttribute("data-still", "true");
    const dust = page.locator(".shelf-dust");
    await expect(dust).toHaveAttribute("data-frames", "1");
    await expect(dust.locator(".dust-spine")).toHaveCount(3);
    await expect(dust.locator(".dust-spine").first()).toHaveAttribute("data-pattern", "dashed");
    await expect(dust.locator(".dust-spine").first()).toHaveCSS("border-top-style", "dashed");
    await expect(page.getByText("The shelf is bare.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add a note" })).toHaveCSS("background-color", "rgb(210, 140, 64)");
    await expect(page.getByRole("button", { name: "Place a sheet" })).toBeVisible();
    await expect(page.locator(".shelf-bay[data-kind='kit'] .status-frame").first()).toHaveAttribute("data-state", "idle");
    expect(await dust.evaluate((el) => el.getAnimations().length)).toBe(0);
    expect(calls).toEqual([]);
    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });

    if (info.project.name === "desktop") await keep(page, "empty-shelf");

    if (info.project.name === "desktop") {
      await page.evaluate(() => {
        document.documentElement.style.filter = "grayscale(1)";
      });
      await expect(page.getByText("The shelf is bare.")).toBeVisible();
      await expect(page.getByRole("button", { name: "Add a note" })).toBeVisible();
      await expect(dust.locator(".dust-spine").first()).toHaveCSS("border-top-style", "dashed");
      await keep(page, "grayscale");
      await page.evaluate(() => {
        document.documentElement.style.filter = "none";
      });
    }

    await page.getByRole("button", { name: "Add a note" }).click();
    await expect(page.getByRole("textbox", { name: "Your note" })).toBeVisible();
    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });
    await page.getByRole("button", { name: "Set it down" }).click();
    await expect(page.getByText("The shelf is bare.")).toBeVisible();

    if (info.project.name !== "desktop") return;

    await page.getByRole("button", { name: "Add a note" }).click();
    await page.getByRole("textbox", { name: "Your note" }).fill("Dust becomes a spine.");
    await page.getByRole("button", { name: "Save this note" }).click();
    await expect(page.getByText("Saved on the shelf.")).toBeVisible();
    await page.getByRole("button", { name: "Set it down" }).click();
    await expect(page.getByRole("button", { name: "Dust becomes a spine." })).toBeVisible();
    await expect(page.getByText("The shelf is bare.")).toHaveCount(0);
    const kept = await vaultCounts(page);
    expect(kept).toEqual({ human: 1, machine: 0 });
    expect(calls).toEqual([]);
  });
});
