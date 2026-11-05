import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const shotDir = "../docs/screenshots/library-shelf";
const artifactDir = "/opt/cursor/artifacts/screenshots/library-shelf";
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

async function openLibrary(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/team/hale-design-lab");
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "Library" }).click();
  await expect(page.locator(".library-room")).toHaveAttribute("data-ready", "true");
  await expect(page.locator(".library-room")).toHaveAttribute("data-vault", "human");
  await expect(page.locator(".library-room")).toHaveAttribute("data-still", "true");
}

function moreName(layout: string | null) {
  return layout === "portrait" ? "+4 more on Default kit" : "+2 more on Default kit";
}

test.describe("library as a scalable shelf", () => {
  test("groups kinds, pins the kit, filters, and overflows off the vault", async ({ page }, info) => {
    test.skip(info.project.name === "desktop-video", "visual projects only");
    const calls: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/api/") || url.includes("/notes") || url.includes("/tasks")) calls.push(url);
    });
    await openLibrary(page);
    const layout = await page.locator(".app").getAttribute("data-layout");
    const bays = page.locator(".shelf-bay");
    await expect(bays).toHaveCount(3);
    await expect(bays.nth(0)).toHaveAttribute("data-kind", "kit");
    await expect(bays.nth(0)).toHaveAttribute("data-pinned", "true");
    await expect(bays.nth(1)).toHaveAttribute("data-kind", "notes");
    await expect(bays.nth(2)).toHaveAttribute("data-kind", "paths");
    await expect(page.locator(".shelf-kind").first()).toHaveAttribute("data-label", "pixel");
    await expect(page.getByText("The shelf is bare.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reading Room path" })).toBeVisible();
    await expect(page.locator('.shelf-bay[data-kind="kit"] .spine:not(.spine-more) .status-frame').first()).toHaveAttribute(
      "data-state",
      "idle",
    );
    await expect(page.locator('.shelf-bay[data-kind="kit"] .status-frame').first()).toHaveAttribute("data-pattern", "solid");
    await expect(page.locator('.shelf-bay[data-kind="kit"] .status-frame').first()).toHaveAttribute("data-frames", "1");
    await expect(page.locator('.shelf-bay[data-kind="kit"] .status-frame').first()).toHaveAttribute("data-still", "true");
    await expect(page.locator(".shelf-filter").first()).toHaveCSS("border-top-color", "rgb(210, 140, 64)");

    const more = page.getByRole("button", { name: moreName(layout) });
    await expect(more).toBeVisible();
    const visibleKit = page.locator('.shelf-bay[data-kind="kit"] .spine:not(.spine-more)');
    await expect(visibleKit).toHaveCount(layout === "portrait" ? 2 : 4);
    expect(calls).toEqual([]);
    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });

    if (info.project.name === "desktop") await keep(page, "desktop");
    if (info.project.name === "tablet-portrait") await keep(page, "tablet");

    await more.click();
    const slip = page.getByRole("region", { name: "More on Default kit" });
    await expect(slip).toBeVisible();
    await expect(slip).toHaveAttribute("data-still", "true");
    expect(await slip.evaluate((el) => el.getAnimations().length)).toBe(0);
    await expect(slip.getByText("Quill")).toBeVisible();
    await expect(slip.getByText("Desk ledger")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Your note" })).toHaveCount(0);
    if (info.project.name === "desktop") await keep(page, "overflow");
    await page.keyboard.press("Escape");
    await expect(slip).toHaveCount(0);

    await page.getByRole("textbox", { name: "Filter Default kit" }).fill("seal");
    await expect(page.getByRole("button", { name: "Founder seal" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Quill" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: moreName(layout) })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Field Notes path" })).toBeVisible();
    await expect(page.locator(".library-room")).toHaveAttribute("data-pinned-kit", "true");
    if (info.project.name === "desktop") await keep(page, "filtered");
    expect(calls).toEqual([]);
    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });

    await page.getByRole("button", { name: "Unpin default kit" }).click();
    await expect(bays.nth(0)).toHaveAttribute("data-kind", "notes");
    await expect(page.locator('.shelf-bay[data-kind="kit"]')).toHaveAttribute("data-pinned", "false");
    await page.reload();
    await page.getByRole("button", { name: "Library" }).click();
    await expect(page.locator(".library-room")).toHaveAttribute("data-ready", "true");
    await expect(page.locator(".shelf-bay").nth(0)).toHaveAttribute("data-kind", "notes");
    await expect(page.locator(".shelf-bay").nth(2)).toHaveAttribute("data-kind", "kit");
    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });
    await page.getByRole("button", { name: "Pin default kit" }).click();
    await expect(page.locator(".shelf-bay").nth(0)).toHaveAttribute("data-kind", "kit");

    if (info.project.name !== "desktop") return;

    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    await expect(page.locator('.shelf-bay[data-kind="paths"] .status-frame').first()).toContainText("Idle");
    await expect(page.locator('.shelf-bay[data-kind="notes"] .shelf-kind')).toHaveText("Notes");
    await expect(page.locator('.shelf-bay[data-kind="paths"] .shelf-kind')).toHaveText("Paths");
    await expect(page.locator('.shelf-bay[data-kind="kit"] .shelf-kind')).toHaveText("Default kit");
    await keep(page, "grayscale");
    await page.evaluate(() => {
      document.documentElement.style.filter = "none";
    });

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-arrange", "tiles");
    await expect(page.locator(".mail-slot")).toBeVisible();
    await page.getByRole("button", { name: "Team" }).click();
    await expect(page.locator(".brass-pin").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Swap seat" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit agent" }).first()).toBeVisible();
    await page.keyboard.press("Control+k");
    await expect(page.locator(".command-ledger")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".command-ledger")).toHaveCount(0);
    expect(calls).toEqual([]);
    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });
  });

  test("a machine note never becomes a spine and a human sheet stays on Notes", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one vault pass");
    await openLibrary(page);
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open("FounderOSLocalDB");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(["humanNotes", "machineNotes"], "readwrite");
        tx.objectStore("humanNotes").put({
          id: "HN-SHELFBOUND",
          projectId: "work:hale-design-lab",
          vault: "human",
          content: "A human spine.",
          revision: 1,
          updatedAt: "2026-10-29T10:00:00.000Z",
        });
        tx.objectStore("machineNotes").put({
          id: "MN-SHELFMACHINE0000000001",
          projectId: "work:hale-design-lab",
          vault: "machine",
          content: "A machine draft that must stay off the shelf.",
          revision: 1,
          updatedAt: "2026-10-29T13:00:00.000Z",
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    });
    await page.reload();
    await page.getByRole("button", { name: "Library" }).click();
    await expect(page.locator(".library-room")).toHaveAttribute("data-ready", "true");
    const notes = page.locator('.shelf-bay[data-kind="notes"]');
    await expect(notes.getByRole("button", { name: "A human spine." })).toBeVisible();
    await expect(notes.locator(".status-frame")).toHaveAttribute("data-state", "done");
    await expect(notes.locator(".status-frame")).toHaveAttribute("data-pattern", "corners");
    await expect(page.getByText("A machine draft that must stay off the shelf.")).toHaveCount(0);
    await expect(page.getByText("The shelf is bare.")).toHaveCount(0);

    await page.getByRole("textbox", { name: "Filter Notes" }).fill("machine");
    await expect(page.getByText("None on this shelf.")).toBeVisible();
    await expect(page.getByRole("button", { name: "A human spine." })).toHaveCount(0);
    await page.getByRole("textbox", { name: "Filter Notes" }).fill("");
    await notes.getByRole("button", { name: "A human spine." }).click();
    await expect(page.getByRole("textbox", { name: "Your note" })).toHaveValue("A human spine.");
    await page.getByRole("button", { name: "Set it down" }).click();

    const kept = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open("FounderOSLocalDB");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const read = (store: string, id: string) =>
        new Promise<Record<string, unknown> | undefined>((resolve, reject) => {
          const tx = db.transaction(store, "readonly");
          const req = tx.objectStore(store).get(id);
          req.onsuccess = () => resolve(req.result as Record<string, unknown> | undefined);
          req.onerror = () => reject(req.error);
        });
      const human = await read("humanNotes", "HN-SHELFBOUND");
      const machine = await read("machineNotes", "MN-SHELFMACHINE0000000001");
      db.close();
      return { human, machine };
    });
    expect(kept.human).toMatchObject({ vault: "human", content: "A human spine.", revision: 1 });
    expect(kept.machine).toMatchObject({
      vault: "machine",
      content: "A machine draft that must stay off the shelf.",
    });
    expect(await vaultCounts(page)).toEqual({ human: 1, machine: 1 });
  });
});
