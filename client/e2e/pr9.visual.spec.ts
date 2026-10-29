import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const pr9 = "../docs/screenshots/pr9";
mkdirSync(pr9, { recursive: true });
mkdirSync("/opt/cursor/artifacts/screenshots/pr9", { recursive: true });

async function keep(page: Page, name: string) {
  const path = `${pr9}/${name}.png`;
  await page.screenshot({ path, animations: "disabled" });
  copyFileSync(path, `/opt/cursor/artifacts/screenshots/pr9/${name}.png`);
}

async function land(page: Page, project: string) {
  if (project === "tablet-portrait") await page.setViewportSize({ width: 1000, height: 1600 });
  if (project === "tablet-landscape") await page.setViewportSize({ width: 1600, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn/reading-room");
  await expect(page.locator(".learn-room")).toHaveAttribute("data-ready", "true");
  await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "desk");
}

async function humanNotes(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("FounderOSLocalDB");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    try {
      if (!db.objectStoreNames.contains("humanNotes")) return [];
      return await new Promise<Array<{ content: string; vault: string; projectId: string; ink?: { points: { p: number }[] }[] }>>(
        (resolve, reject) => {
          const tx = db.transaction("humanNotes", "readonly");
          const request = tx.objectStore("humanNotes").getAll();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
        },
      );
    } finally {
      db.close();
    }
  });
}

async function inkPixels(page: Page) {
  return page.locator("canvas.ponder-ink").evaluate((node) => {
    const canvas = node as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    if (!ctx || canvas.width === 0 || canvas.height === 0) return 0;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let count = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 16) count += 1;
    }
    return count;
  });
}

async function drawMark(page: Page) {
  const canvas = page.locator("canvas.ponder-ink");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box || box.height < 120) throw new Error("ink sheet has no room to draw");
  const x = box.x + box.width * 0.22;
  const y = box.y + box.height * 0.38;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + box.width * 0.42, y + box.height * 0.08, { steps: 14 });
  await page.mouse.move(x + box.width * 0.16, y + box.height * 0.32, { steps: 14 });
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-strokes", "1");
}

test.describe("ponder ink", () => {
  test("draws on the lifted sheet, discards on set down, and keeps ink across a reload", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj === "desktop-video", "visual projects only");
    await land(page, proj);
    await expect(page.getByRole("heading", { name: "Ponder" })).toBeVisible();
    await expect(page.getByText("A blank sheet. Lift it to write.")).toBeVisible();
    await expect(page.locator(".desk-apron")).toBeVisible();
    const heading = page.getByRole("heading", { name: "Ponder" });
    if (proj === "tablet-portrait") await heading.tap();
    else await heading.click();
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "lifted");
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-still", "true");
    await expect(page.getByRole("textbox", { name: "Your note" })).toBeVisible();
    const sheet = page.getByLabel("Ink sheet");
    await expect(sheet).toHaveAttribute("data-live", "true");
    await expect(sheet).toHaveAttribute("data-strokes", "0");
    expect(await page.locator(".ponder-ink").evaluate((el) => el.getAnimations().length)).toBe(0);

    await drawMark(page);
    await expect.poll(() => inkPixels(page)).toBeGreaterThan(20);
    if (proj === "tablet-portrait") await page.getByRole("textbox", { name: "Your note" }).fill("Beside the ink.");
    await keep(page, `ponder-ink-${proj}`);

    await page.getByRole("button", { name: "Set it down" }).click();
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "desk");
    await expect(page.locator("canvas.ponder-ink")).toHaveCount(0);
    expect(await humanNotes(page)).toEqual([]);
    await page.reload();
    await expect(page.locator(".learn-room")).toHaveAttribute("data-ready", "true");
    await expect(page.locator("canvas.ponder-ink")).toHaveCount(0);
    await expect(page.getByText("A blank sheet. Lift it to write.")).toBeVisible();

    await page.getByRole("heading", { name: "Ponder" }).click();
    await drawMark(page);
    if (proj === "tablet-portrait") {
      await expect(page.getByRole("textbox", { name: "Your note" })).toHaveValue("");
    }
    await page.getByRole("button", { name: "Keep this note" }).click();
    await expect(page.getByRole("status")).toHaveText("Kept with your notes.");
    const saved = await humanNotes(page);
    expect(saved).toHaveLength(1);
    expect(saved[0].vault).toBe("human");
    expect(saved[0].projectId).toBe("school:reading-room");
    expect(saved[0].ink?.[0].points.length).toBeGreaterThan(1);
    expect(saved[0].ink?.[0].points[0].p).toBeGreaterThan(0);
    expect(saved[0].ink?.[0].points[0].p).toBeLessThanOrEqual(1);

    await page.getByRole("button", { name: "Set it down" }).click();
    await page.reload();
    await expect(page.locator(".learn-room")).toHaveAttribute("data-ready", "true");
    await expect(page.locator("canvas.ponder-ink")).toHaveAttribute("data-strokes", "1");
    await expect(page.locator("canvas.ponder-ink")).toHaveAttribute("data-live", "false");
    await expect.poll(() => inkPixels(page)).toBeGreaterThan(20);
    if (proj === "tablet-portrait") await expect(page.getByText("Beside the ink.")).toHaveCount(0);
    await keep(page, `ponder-kept-${proj}`);
  });
});

test("grayscale ink stays on the sheet", async ({ page }, info) => {
  test.skip(info.project.name !== "tablet-portrait", "one grayscale sheet");
  await page.setViewportSize({ width: 1000, height: 1600 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn/reading-room");
  await page.getByRole("heading", { name: "Ponder" }).tap();
  await drawMark(page);
  await page.evaluate(() => {
    document.documentElement.style.filter = "grayscale(1)";
  });
  await expect.poll(() => inkPixels(page)).toBeGreaterThan(20);
  await keep(page, "ponder-ink-grayscale-tablet-portrait");
});

test("axe has no serious or critical issues on the ink sheet", async ({ page }, info) => {
  test.skip(info.project.name !== "tablet-portrait", "one axe pass");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn/reading-room");
  await page.getByRole("heading", { name: "Ponder" }).click();
  await drawMark(page);
  const result = await new AxeBuilder({ page }).analyze();
  const bad = result.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);
});

test("team board, library, overview, and the CEO study stay in place", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one preservation pass");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/team/hale-design-lab");
  await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
  await page.getByRole("button", { name: "Team" }).click();
  await expect(page.locator(".team-board")).toHaveAttribute("data-count", "3");
  await page.getByRole("button", { name: "Library" }).click();
  await expect(page.locator(".library-room")).toHaveAttribute("data-ready", "true");
  await expect(page.locator(".library-room")).toHaveAttribute("data-vault", "human");
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page.locator(".desk-grid")).toHaveAttribute("data-count", "3");
  await page.goto("/learn/reading-room");
  await expect(page.getByRole("heading", { name: "Ponder" })).toBeVisible();
  await expect(page.locator(".desk-apron")).toBeVisible();
});
