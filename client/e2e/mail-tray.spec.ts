import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const shotDir = "../docs/screenshots/mail-tray";
const artifactDir = "/opt/cursor/artifacts/screenshots/mail-tray";
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

async function openHaleOverview(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/team/hale-design-lab");
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.locator(".desk-grid")).toHaveAttribute("data-count", "3");
  await expect(page.locator(".agent-desk[data-agent='ceo'] .status-frame")).toHaveAttribute("data-state", "working");
  await expect(page.locator(".agent-desk[data-agent='atelier'] .desk-stamp-task")).toHaveText("idle");
  await expect(page.locator(".lamp-chain")).toHaveCount(3);
}

test.describe("mail slot tray", () => {
  test("desktop tray filters with J/K and Enter does not write a vault", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop shots");
    await openHaleOverview(page);
    const slot = page.getByRole("button", { name: "2 Needs you, mail slot" });
    await slot.click();
    const tray = page.locator(".mail-tray");
    await expect(tray).toHaveAttribute("data-material", "desk");
    await expect(tray).toHaveAttribute("data-frames", "1");
    await expect(page.locator(".mail-slot")).toHaveAttribute("data-still", "true");
    expect(await tray.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
    await expect(page.getByRole("listbox", { name: "Needs you" })).toBeFocused();
    await expect(page.locator(".mail-slip")).toHaveCount(2);
    await expect(page.locator(".mail-slip").nth(0)).toHaveAttribute("data-glyph", "seal");
    await expect(page.locator(".mail-slip").nth(0)).toHaveAttribute("data-pattern", "corners");
    await keep(page, "desktop");

    await page.keyboard.press("j");
    await expect(page.locator(".mail-slip").nth(1)).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("k");
    await expect(page.locator(".mail-slip").nth(0)).toHaveAttribute("aria-selected", "true");

    await page.locator(".mail-filter[data-agent='atelier']").click();
    await expect(page.locator(".mail-slip")).toHaveCount(1);
    await expect(page.locator(".mail-slip")).toHaveAttribute("data-agent", "atelier");
    await keep(page, "filtered");

    await page.locator(".mail-filter[data-agent='courier']").click();
    await expect(page.getByText("The tray is empty.")).toBeVisible();
    await expect(page.locator(".mail-tray")).toHaveAttribute("data-empty", "true");
    await expect(page.locator(".mail-slip")).toHaveCount(0);
    await keep(page, "empty");

    await page.locator(".mail-filter", { hasText: "All" }).click();
    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    await expect(page.locator(".mail-slip").nth(0)).toHaveAttribute("data-pattern", "corners");
    await expect(page.locator(".mail-slip").nth(1)).toHaveAttribute("data-glyph", "seal");
    await keep(page, "grayscale");

    const calls: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/api/") || url.includes("/notes") || url.includes("/tasks")) calls.push(url);
    });
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Approve this action?" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("data-approval", "overlay");
    await expect(page.getByRole("status")).toHaveCount(0);
    await expect(page.getByText("Approved. Nothing ran.")).toHaveCount(0);
    expect(calls).toEqual([]);
    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });
    await expect(page.locator(".mail-tray")).toHaveCount(0);
  });

  test("tablet tap opens the slot and the same slip", async ({ page }, info) => {
    test.skip(info.project.name !== "tablet-portrait", "tablet shot");
    await openHaleOverview(page);
    await page.getByRole("button", { name: "2 Needs you, mail slot" }).click();
    await expect(page.locator(".mail-slip")).toHaveCount(2);
    await expect(page.locator(".mail-slot")).toHaveAttribute("data-frames", "1");
    await keep(page, "tablet");

    await page.locator(".mail-slip").nth(0).click();
    await expect(page.getByRole("dialog", { name: "Approve this action?" })).toBeVisible();
    await expect(page.getByText("Approved. Nothing ran.")).toHaveCount(0);
    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });
  });
});
