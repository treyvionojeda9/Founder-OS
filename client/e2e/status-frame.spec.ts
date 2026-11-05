import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const shotDir = "../docs/screenshots/status-frame";
const artifactDir = "/opt/cursor/artifacts/screenshots/status-frame";
mkdirSync(shotDir, { recursive: true });
mkdirSync(artifactDir, { recursive: true });

async function keep(page: Page, name: string) {
  const path = `${shotDir}/${name}.png`;
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  copyFileSync(path, `${artifactDir}/${name}.png`);
}

async function openStage(page: Page, grayscale: boolean) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  if (grayscale) {
    await page.addInitScript(() => {
      const paint = () => {
        document.documentElement.style.filter = "grayscale(1)";
      };
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paint);
      paint();
    });
  }
  await page.goto("/status-frame");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: "Status frame" })).toBeVisible();
}

test.describe("shared status frame", () => {
  test("desks, plaques, and spines show all five states", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj !== "tablet-portrait" && proj !== "desktop", "tablet portrait and desktop");
    await openStage(page, false);

    const strip = page.locator(".status-strip .status-frame");
    await expect(strip).toHaveCount(5);
    await expect(strip).toHaveText(["Idle", "Working", "Waiting for you", "Done", "Error"]);
    const patterns = await strip.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-pattern")));
    expect(patterns).toEqual(["solid", "dash", "double", "corners", "crack"]);
    for (const frame of await strip.elementHandles()) {
      expect(await frame.getAttribute("data-frames")).toBe("1");
      expect(await frame.getAttribute("data-still")).toBe("true");
    }

    await expect(page.locator(".agent-desk[data-status='waiting'] .agent-seat")).toHaveAttribute("data-pose", "raised-hand");
    await expect(page.locator(".agent-desk[data-status='waiting'] .raised-hand")).toBeVisible();
    await expect(page.locator(".agent-desk[data-pose='raised-hand'], .agent-seat[data-pose='raised-hand']")).toHaveCount(1);
    await expect(page.locator(".agent-desk[data-status='idle'] .agent-seat")).toHaveAttribute("data-pose", "seated");
    await expect(page.locator(".agent-desk[data-status='working'] .lamp-flame")).toHaveAttribute("data-flicker", "still");
    await expect(page.locator(".agent-desk[data-status='failed']")).toHaveAttribute("data-status", "failed");
    await expect(page.locator(".agent-desk[data-status='failed'] [aria-label='Desk lamp, failed']")).toBeVisible();
    await expect(page.locator(".agent-desk[data-status='failed'] .status-frame")).toHaveAttribute("data-state", "error");
    await expect(page.locator(".agent-desk[data-status='done'] [aria-label='Desk lamp, dark']")).toBeVisible();
    await expect(page.locator(".agent-desk[data-status='waiting'] [data-light-pool]")).toHaveCount(0);

    const plaques = page.locator(".plaque .status-frame");
    await expect(plaques).toHaveCount(5);
    await expect(plaques).toHaveText(["Idle", "Working", "Waiting for you", "Done", "Error"]);

    const spines = page.locator(".status-spines .spine .status-frame");
    await expect(spines).toHaveCount(5);
    const spineStates = await spines.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-state")));
    expect(spineStates).toEqual(["idle", "working", "waiting", "done", "error"]);
    await expect(page.getByRole("button", { name: "Waiting sheet" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await keep(page, proj === "desktop" ? "desktop" : "tablet");
  });

  test("grayscale still separates the five frames", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one grayscale pass");
    await openStage(page, true);
    const strip = page.locator(".status-strip");
    await strip.evaluate((el) => {
      el.style.filter = "grayscale(1)";
    });
    const frames = strip.locator(".status-frame");
    const shots: Buffer[] = [];
    for (let i = 0; i < 5; i += 1) shots.push(await frames.nth(i).screenshot({ animations: "disabled" }));
    for (let i = 0; i < shots.length; i += 1) {
      for (let j = i + 1; j < shots.length; j += 1) expect(shots[i].equals(shots[j])).toBe(false);
    }
    const stripPath = `${shotDir}/strip-grayscale.png`;
    await strip.screenshot({ path: stripPath, animations: "disabled" });
    copyFileSync(stripPath, `${artifactDir}/strip-grayscale.png`);
    await keep(page, "grayscale");
  });
});
