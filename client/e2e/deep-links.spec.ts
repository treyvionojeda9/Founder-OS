import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { founderEmber } from "../src/design/palette";

const shotDir = "../docs/screenshots/deep-links";
const artifactDir = "/opt/cursor/artifacts/screenshots/deep-links";
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

test.describe("deep links", () => {
  test("opens an agent, a note, and a path node from a url", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop shots");
    test.setTimeout(90_000);
    await page.addInitScript(() => {
      const bag: string[] = [];
      (window as Window & { __copied?: string[]; __copyText?: (value: string) => void }).__copied = bag;
      (window as Window & { __copyText?: (value: string) => void }).__copyText = (value: string) => {
        bag.push(value);
      };
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const writes: string[] = [];
    page.on("request", (req) => {
      if (req.method() !== "GET" && req.method() !== "HEAD") writes.push(req.url());
    });

    await page.goto("/work/overview?agent=ceo");
    await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
    await expect(page.locator(".study")).toHaveAttribute("data-deep-focus", "ceo");
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-lighting", "ember");
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-space", "work");
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-arrange", "tiles");
    await expect(page.locator(".desk-room > .pipeline-rooms")).toHaveCount(1);
    await expect(page.locator(".desk-hall .pipeline-rooms")).toHaveCount(0);
    await expect(page.locator(".desk-drawer-pull")).toHaveCount(3);
    await expect(page.locator(".mail-mouth")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Library" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Team" })).toBeVisible();
    await expect(page.locator(".pixel-bar")).toBeVisible();
    await expect(page.locator("[data-approval='inline']")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const pin = page.getByRole("button", { name: "Copy link" });
    await expect(pin).toBeVisible();
    await expect(pin).toHaveAttribute("data-kind", "agent");
    await expect(pin).toHaveAttribute("data-frames", "1");
    expect(await pin.locator(".copy-corner").evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      rgb(founderEmber.ember),
    );
    expect(await pin.locator(".copy-pin").evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      rgb(founderEmber.paper),
    );
    expect(await pin.locator(".copy-pin").evaluate((el) => getComputedStyle(el).borderTopColor)).toBe(
      rgb(founderEmber.night),
    );
    await page.evaluate(() => document.fonts.ready);
    await keep(page, "agent");

    await pin.click();
    const mark = page.locator(".copy-link");
    await expect(mark).toHaveAttribute("data-copied", "true");
    await expect(mark).toHaveAttribute("data-pattern", "tick");
    await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
    expect(await mark.locator(".copy-pin").evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      rgb(founderEmber.night),
    );
    expect(
      (await page.evaluate(() => (window as Window & { __copied?: string[] }).__copied ?? [])).join("\n"),
    ).toContain("/work/overview?agent=ceo");
    await expect(page.getByText("Copied")).toHaveCount(0);

    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    await keep(page, "grayscale");
    await page.evaluate(() => {
      document.documentElement.style.filter = "";
    });

    await page.keyboard.press("Control+k");
    await expect(page.locator(".command-ledger")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".command-ledger")).toHaveCount(0);
    await expect(page.locator(".study")).toHaveAttribute("data-deep", "overview");
    await expect(page.locator(".desk-room > .pipeline-rooms")).toHaveCount(1);

    await page.goto("/work/overview?agent=not-a-desk");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.locator(".study")).toHaveAttribute("data-deep-focus", "none");
    await expect(page.locator(".overview-sheet")).toHaveCount(0);
    await expect(page.locator(".desk-room > .pipeline-rooms")).toBeVisible();
    await expect(page.locator(".desk-hall .pipeline-rooms")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /mail slot/i })).toBeVisible();
    await expect(page.getByRole("group", { name: "Desk tiles" })).toBeVisible();

    await page.goto("/work/library");
    await expect(page.locator(".library-room")).toHaveAttribute("data-ready", "true");
    await page.getByRole("button", { name: "Place a sheet" }).click();
    await page.getByLabel("Your note").fill("A kept margin.");
    await page.getByRole("button", { name: "Save this note" }).click();
    await expect(page.locator(".library-room")).toHaveAttribute("data-focus", /^HN-/);
    const noteId = await page.locator(".library-room").getAttribute("data-focus");
    expect(noteId).toBeTruthy();
    const afterSave = await vaultCounts(page);

    await page.goto(`/work/library?note=${noteId}`);
    await expect(page.locator(".library-room")).toHaveAttribute("data-focus", noteId!);
    await expect(page.getByLabel("Your note")).toHaveValue("A kept margin.");
    await expect(page.getByRole("button", { name: "Copy link" })).toHaveAttribute("data-kind", "note");
    await expect(page.locator(".library-room")).toHaveAttribute("data-vault", "human");
    await page.evaluate(() => document.fonts.ready);
    await keep(page, "note");
    expect(await vaultCounts(page)).toEqual(afterSave);

    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.locator(".copy-link")).toHaveAttribute("data-copied", "true");
    expect(
      (await page.evaluate(() => (window as Window & { __copied?: string[] }).__copied ?? [])).join("\n"),
    ).toContain(`/work/library?note=${noteId}`);

    await page.goto("/work/library?note=HN-NOT-A-REAL-NOTE");
    await expect(page.locator(".library-room")).toHaveAttribute("data-ready", "true");
    await expect(page.locator(".library-room")).toHaveAttribute("data-focus", "none");
    await expect(page.locator(".library-paper")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
    expect(await vaultCounts(page)).toEqual(afterSave);

    await page.goto("/school/path?node=task-one-page");
    await expect(page.getByRole("dialog", { name: "Reading Room path" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Sit with one page" })).toBeVisible();
    await expect(page.locator(".learn-room")).toHaveAttribute("data-deep-focus", "task-one-page");
    await expect(page.locator(".path-map")).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy link" })).toHaveAttribute("data-kind", "node");
    await expect(page.locator(".path-sheet textarea")).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    await keep(page, "path-node");
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.locator(".copy-link")).toHaveAttribute("data-copied", "true");
    expect(
      (await page.evaluate(() => (window as Window & { __copied?: string[] }).__copied ?? [])).join("\n"),
    ).toContain("/school/path?node=task-one-page");

    await page.goto("/school/path?node=missing-station");
    await expect(page.getByRole("dialog", { name: "Reading Room path" })).toBeVisible();
    await expect(page.locator(".learn-room")).toHaveAttribute("data-deep-focus", "none");
    await expect(page.locator(".path-sheet")).toHaveCount(0);
    await expect(page.locator(".path-node")).toHaveCount(4);
    expect(await vaultCounts(page)).toEqual(afterSave);
    expect(writes).toEqual([]);
  });

  test("tablet opens the agent sheet from the url", async ({ page }, info) => {
    test.skip(info.project.name !== "tablet-portrait", "tablet check");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/work/overview?agent=atelier");
    await expect(page.getByRole("heading", { name: "Atelier chat" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();
    await expect(page.locator("[data-approval='inline']")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(".study")).toHaveAttribute("data-deep-focus", "atelier");
  });
});
