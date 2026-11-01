import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { founderEmber } from "../src/design/palette";

const shotDir = "../docs/screenshots/pipeline-rooms";
const artifactDir = "/opt/cursor/artifacts/screenshots/pipeline-rooms";
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
  const rooms = page.locator(".pipeline-rooms");
  await expect(rooms).toBeVisible();
  return rooms;
}

test.describe("pipeline rooms", () => {
  test("places tokens from status, filters desks, and stays in Founder Ember", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop shot");
    test.setTimeout(60_000);
    const writes: string[] = [];
    page.on("request", (req) => {
      if (req.method() !== "GET" && req.method() !== "HEAD") writes.push(req.url());
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const rooms = await openOverview(page);

    await expect(rooms).toHaveAttribute("data-lighting", "ember");
    await expect(rooms).toHaveAttribute("data-reach", "local");
    await expect(rooms).toHaveAttribute("data-still", "true");
    await expect(rooms).toHaveAttribute("data-frames", "1");
    await expect(rooms).toHaveAttribute("data-filter", "all");
    await expect(page.locator(".pipeline-room")).toHaveCount(4);
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-lighting", "ember");
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-pipeline", "all");
    await expect(page.getByRole("button", { name: "Library" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Team" })).toBeVisible();
    await expect(page.getByRole("button", { name: /mail slot/i })).toBeVisible();
    await expect(page.getByRole("group", { name: "Desk tiles" })).toBeVisible();
    await expect(page.locator(".agent-desk .status-frame")).toHaveCount(3);

    const intake = page.locator(".pipeline-room[data-stage='intake']");
    const working = page.locator(".pipeline-room[data-stage='working']");
    const waiting = page.locator(".pipeline-room[data-stage='waiting']");
    const done = page.locator(".pipeline-room[data-stage='done']");
    await expect(intake).toHaveAttribute("data-pattern", "solid");
    await expect(working).toHaveAttribute("data-pattern", "dash");
    await expect(waiting).toHaveAttribute("data-pattern", "double");
    await expect(done).toHaveAttribute("data-pattern", "corners");
    await expect(intake.locator(".pipeline-token")).toHaveAttribute("data-agent", "atelier");
    await expect(intake.locator(".pipeline-token")).toHaveAttribute("data-glyph", "rest");
    await expect(working.locator(".pipeline-token")).toHaveAttribute("data-agent", "ceo");
    await expect(working.locator(".pipeline-token")).toHaveAttribute("data-glyph", "flame");
    await expect(working.locator(".pipeline-token")).toHaveAttribute("data-frames", "1");
    await expect(waiting.locator(".pipeline-token")).toHaveAttribute("data-agent", "courier");
    await expect(waiting.locator(".pipeline-token")).toHaveAttribute("data-status", "failed");
    await expect(waiting.locator(".pipeline-token")).toHaveAttribute("data-pattern", "crack");
    await expect(waiting.locator(".pipeline-token")).toHaveAttribute("data-glyph", "crack");
    await expect(done).toHaveAttribute("data-count", "0");

    expect(await intake.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe("solid");
    expect(await intake.evaluate((el) => getComputedStyle(el).borderTopColor)).toBe(rgb(founderEmber.paper));
    expect(await working.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe("dashed");
    const waitingShadow = await waiting.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(waitingShadow).toContain("inset");
    expect(waitingShadow).toContain(rgb(founderEmber.paper));
    expect(waitingShadow).toContain(rgb(founderEmber.night));
    expect(await done.evaluate((el) => getComputedStyle(el).backgroundImage)).not.toBe("none");
    expect(
      await page.locator(".pipeline-token").evaluateAll((els) => els.every((el) => getComputedStyle(el).animationName === "none")),
    ).toBe(true);

    await keep(page, "desktop");

    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    const shots = await Promise.all(
      ["intake", "working", "waiting", "done"].map((stage) =>
        page.locator(`.pipeline-room[data-stage='${stage}']`).screenshot({ animations: "disabled" }),
      ),
    );
    for (let i = 0; i < shots.length; i += 1) {
      for (let j = i + 1; j < shots.length; j += 1) expect(shots[i].equals(shots[j])).toBe(false);
    }
    await keep(page, "grayscale");
    await page.evaluate(() => {
      document.documentElement.style.filter = "";
    });

    await page.getByRole("button", { name: /^Working, 1 agent$/ }).click();
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-pipeline", "working");
    await expect(page.locator(".pipeline-rooms")).toHaveAttribute("data-filter", "working");
    await expect(page.locator("li[data-agent='ceo']")).toHaveAttribute("data-stage-match", "true");
    await expect(page.locator("li[data-agent='atelier']")).toHaveAttribute("data-stage-match", "false");
    await expect(page.locator("li[data-agent='courier']")).toHaveAttribute("data-stage-match", "false");
    await expect(page.locator(".agent-desk[data-agent='ceo']")).toHaveAttribute("data-status", "working");
    const plaque = page.locator(".agent-desk[data-agent='ceo'] .agent-desk-plaque");
    expect(await plaque.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("dashed");
    expect(await page.locator("li[data-agent='atelier']").evaluate((el) => getComputedStyle(el).opacity)).toBe("0.32");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "CEO chat" })).toHaveCount(0);
    await keep(page, "filtered");

    await page.getByRole("button", { name: /^Working, 1 agent$/ }).click();
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-pipeline", "all");
    await page.locator(".agent-desk[data-agent='atelier']").click();
    await expect(page.getByRole("heading", { name: "Atelier chat" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.locator(".pipeline-rooms")).toBeVisible();

    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });
    expect(writes).toEqual([]);
  });

  test("tablet tap filters the intake desks", async ({ page }, info) => {
    test.skip(info.project.name !== "tablet-portrait", "tablet shot");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openOverview(page);
    await expect(page.locator(".pipeline-room")).toHaveCount(4);
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-arrange", "strip");
    await expect(page.getByRole("button", { name: /mail slot/i })).toBeVisible();
    await keep(page, "tablet");
    await page.getByRole("button", { name: /^Intake, 1 agent$/ }).tap();
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-pipeline", "intake");
    await expect(page.locator("li[data-agent='atelier']")).toHaveAttribute("data-stage-match", "true");
    await expect(page.locator("li[data-agent='ceo']")).toHaveAttribute("data-stage-match", "false");
    await expect(page.locator(".pipeline-rooms")).toHaveAttribute("data-frames", "1");
    expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });
  });

  test("motion uses two place frames and reduced motion stays on one", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one motion check");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const moving = await openOverview(page);
    await expect(moving).toHaveAttribute("data-frames", "2");
    await expect(moving).toHaveAttribute("data-still", "false");
    const token = moving.locator(".pipeline-token[data-agent='ceo']");
    await expect(token).toHaveAttribute("data-frames", "2");
    expect(await token.evaluate((el) => getComputedStyle(el).animationName)).toBe("pipeline-place");
    expect(await token.locator(".glyph-frame").count()).toBe(2);

    await page.emulateMedia({ reducedMotion: "reduce" });
    const still = await openOverview(page);
    await expect(still).toHaveAttribute("data-frames", "1");
    await expect(still.locator(".pipeline-token[data-agent='ceo']")).toHaveAttribute("data-frames", "1");
    expect(
      await still.locator(".pipeline-token").evaluateAll((els) => els.every((el) => getComputedStyle(el).animationName === "none")),
    ).toBe(true);
  });
});
