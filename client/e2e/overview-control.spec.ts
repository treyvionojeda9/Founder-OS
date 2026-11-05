import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const shotDir = "../docs/screenshots/overview-control";
const artifactDir = "/opt/cursor/artifacts/screenshots/overview-control";
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

test.describe("overview control plane", () => {
  test("stamps each desk and pauses without writing a vault", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj !== "tablet-portrait" && proj !== "desktop", "tablet and desktop");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/team/hale-design-lab");
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

    for (const agent of ["CEO", "Atelier", "Courier"]) {
      const desk = page.locator(`.agent-desk[data-agent='${agent.toLowerCase()}']`);
      await expect(desk.locator(".desk-stamp-agent")).toHaveText(agent);
      await expect(desk.locator(".desk-stamp-task")).not.toHaveText("");
      await expect(desk.locator(".desk-stamp-time")).not.toHaveText("");
    }
    await expect(page.locator(".agent-desk[data-agent='atelier'] .desk-stamp")).toHaveAttribute("data-task", "idle");
    await expect(page.locator(".agent-desk[data-agent='ceo'] .status-frame")).toHaveAttribute("data-state", "working");
    await expect(page.locator(".agent-desk[data-agent='atelier'] .status-frame")).toHaveAttribute("data-state", "idle");
    await expect(page.locator(".agent-desk[data-agent='courier'] .status-frame")).toHaveAttribute("data-state", "error");

    if (proj === "tablet-portrait") await keep(page, "overview-tablet");
    if (proj === "desktop") await keep(page, "overview-desktop");

    const calls: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/api/") || url.includes("/notes") || url.includes("/tasks")) calls.push(url);
    });

    await page.getByRole("switch", { name: "Pause CEO" }).click();
    const ceo = page.locator(".agent-desk[data-agent='ceo']");
    await expect(ceo).toHaveAttribute("data-paused", "true");
    await expect(ceo).toHaveAttribute("data-work", "halted");
    await expect(ceo).toHaveAttribute("data-status", "working");
    await expect(ceo.locator(".status-chip")).toHaveText("Working");
    await expect(ceo.locator(".lamp-flame")).toHaveAttribute("data-flicker", "still");
    await expect(ceo.locator("[data-light-pool]")).toHaveCount(0);
    await expect(page.locator(".lamp-chain[data-agent='ceo']")).toHaveAttribute("data-pattern", "pulled");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(calls).toEqual([]);
    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });
    if (proj === "desktop") await keep(page, "paused-desk");

    await page.getByRole("switch", { name: "Resume CEO" }).click();
    await expect(ceo).toHaveAttribute("data-paused", "false");
    await expect(ceo.locator("[data-light-pool='desk']")).toBeVisible();
    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });
  });

  test("expands the paper in place and Escape returns", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one expand");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/team/hale-design-lab");
    await page.getByRole("tab", { name: "Overview" }).click();
    await page.locator(".agent-desk[data-agent='atelier']").click();
    await expect(page.getByRole("heading", { name: "Atelier chat" })).toBeVisible();
    await expect(page.locator(".overview-sheet")).toHaveAttribute("data-material", "plaster");
    await expect(page.locator(".overview-sheet")).toHaveAttribute("data-still", "true");
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "expanded");
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-count", "3");
    await expect(page.getByRole("heading", { name: "Overview" })).toHaveCount(0);
    expect(await page.locator(".overview-sheet").evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
    await expect(page.getByRole("button", { name: "Set it down" })).toBeFocused();
    await keep(page, "expanded-sheet");

    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.locator(".overview-sheet")).toHaveCount(0);
    await expect(page.locator(".agent-desk[data-agent='atelier']")).toBeFocused();
    await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
  });

  test("grayscale overview still reads the stamp and the chain", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one grayscale sheet");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/team/hale-design-lab");
    await page.getByRole("tab", { name: "Overview" }).click();
    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    await page.getByRole("switch", { name: "Pause Atelier" }).click();
    await expect(page.locator(".agent-desk[data-agent='atelier'] .desk-stamp-task")).toHaveText("idle");
    await expect(page.locator(".lamp-chain[data-agent='atelier']")).toHaveAttribute("data-pattern", "pulled");
    await expect(page.locator(".lamp-chain[data-agent='ceo']")).toHaveAttribute("data-pattern", "hanging");
    await expect(page.locator(".agent-desk[data-agent='ceo'] .status-frame")).toHaveAttribute("data-pattern", "dash");
    await expect(page.locator(".agent-desk[data-agent='courier'] .status-frame")).toHaveAttribute("data-pattern", "crack");
    await keep(page, "overview-grayscale");
  });
});
