import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const shotDir = "../docs/screenshots/team-tools-dock";
const artifactDir = "/opt/cursor/artifacts/screenshots/team-tools-dock";
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

test.describe("team roster and tools dock", () => {
  test("pins a seat, opens local overlays, and stays off the vault", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj !== "tablet-portrait" && proj !== "desktop", "tablet and desktop");
    if (proj === "tablet-portrait") await page.setViewportSize({ width: 1000, height: 1600 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const calls: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/api/") || url.includes("/notes") || url.includes("/tasks")) calls.push(url);
    });

    await page.goto("/team/hale-design-lab");
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole("button", { name: "Team" }).click();
    const board = page.locator(".team-board");
    await expect(board).toHaveAttribute("data-count", "3");
    await expect(board).toHaveAttribute("data-still", "true");
    await expect(page.locator(".plaque")).toHaveCount(3);

    const ceo = page.locator(".plaque[data-agent='ceo']");
    await expect(ceo.locator("[data-slot='model']")).toContainText("Model");
    await expect(ceo.locator("[data-slot='model']")).toContainText("Forge");
    await expect(ceo.locator("[data-slot='tools']")).toContainText("Tools");
    await expect(ceo.locator("[data-slot='tools']")).toContainText("Forge stamp");
    await expect(ceo.locator("[data-slot='room']")).toContainText("Room");
    await expect(ceo.locator("[data-slot='room']")).toContainText("Study");
    await expect(ceo.locator(".status-frame")).toHaveAttribute("data-status", "working");
    await expect(ceo.locator(".status-frame")).toHaveAttribute("data-state", "working");
    await expect(ceo.locator(".status-frame")).toHaveAttribute("data-pattern", "dash");
    await expect(page.locator(".plaque[data-agent='atelier'] .status-frame")).toHaveAttribute("data-state", "idle");
    await expect(page.locator(".plaque[data-agent='courier'] .status-frame")).toHaveAttribute("data-state", "error");
    await expect(page.locator(".dock-label")).toHaveText(["Swatch sheet", "Forge stamp", "Errand slip"]);
    await expect(page.locator(".tools-dock")).toHaveAttribute("data-dock", "tools");
    await expect(page.locator(".tools-dock")).toHaveAttribute("data-reach", "local");
    await expect(page.getByRole("heading", { name: "Overview" })).toHaveCount(0);
    await keep(page, proj === "desktop" ? "desktop" : "tablet");

    if (proj === "desktop") {
      await page.evaluate(() => {
        document.documentElement.style.filter = "grayscale(1)";
      });
      await expect(page.locator(".plaque[data-status='working']")).toContainText("Working");
      await expect(page.locator(".plaque[data-status='idle']")).toContainText("Idle");
      await expect(page.locator(".plaque[data-status='failed']")).toContainText("Error");
      await expect(page.locator(".brass-pin[data-agent='courier']")).toHaveAttribute("data-pin", "out");
      await keep(page, "grayscale");
      await page.evaluate(() => {
        document.documentElement.style.filter = "none";
      });
    }

    await page.locator(".brass-pin[data-agent='courier']").click();
    await expect(page.locator(".plaque").nth(0)).toHaveAttribute("data-agent", "courier");
    await expect(page.locator(".plaque-seat[data-agent='courier']")).toHaveAttribute("data-pinned", "true");
    await expect(page.locator(".brass-pin[data-agent='courier']")).toHaveAttribute("data-pin", "in");
    await expect(page.locator(".plaque[data-agent='courier'] .status-frame")).toHaveAttribute("data-state", "error");
    if (proj === "desktop") await keep(page, "pinned");

    await page.reload();
    await page.getByRole("button", { name: "Team" }).click();
    await expect(page.locator(".plaque").nth(0)).toHaveAttribute("data-agent", "courier");

    await page.locator(".scene-edit[data-agent='atelier']").click();
    const edit = page.getByRole("dialog", { name: "Edit agent" });
    await expect(edit).toBeVisible();
    await expect(edit).toContainText("This changes the agent everywhere.");
    await expect(edit).toHaveAttribute("data-reach", "local");
    await expect(edit).toHaveAttribute("data-frames", "1");
    await expect(edit).toHaveAttribute("data-still", "true");
    await expect(page.getByRole("dialog", { name: "Approve this action?" })).toHaveCount(0);
    if (proj === "desktop") await keep(page, "overlay");
    await page.getByRole("button", { name: "Set it aside" }).click();
    await expect(edit).toHaveCount(0);

    await page.locator(".scene-swap[data-agent='atelier']").click();
    const swap = page.getByRole("dialog", { name: "Swap seat" });
    await expect(swap).toContainText("Nothing is sent.");
    await page.getByRole("button", { name: "Swap with CEO" }).click();
    await expect(page.getByRole("status")).toHaveText("Marked on this board. Nothing was sent.");
    await expect(page.locator(".plaque").nth(0)).toHaveAttribute("data-agent", "courier");
    await expect(page.getByRole("tab", { name: "Atelier" })).toBeVisible();

    await page.getByRole("button", { name: "Stapler" }).click();
    await expect(page.getByRole("menu", { name: "Fixture tools" })).toBeVisible();
    await expect(page.getByRole("menuitem")).toHaveText(["Swatch sheet", "Forge stamp", "Errand slip"]);
    await page.keyboard.press("Escape");

    expect(calls).toEqual([]);
    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });
    const overflow = await page.evaluate(() => ({
      root: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
    }));
    expect(overflow.root).toBeLessThanOrEqual(1);
    expect(overflow.body).toBeLessThanOrEqual(1);
  });
});
