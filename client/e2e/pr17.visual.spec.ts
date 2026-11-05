import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";

const pr17 = "../docs/screenshots/pr17-school";
mkdirSync(pr17, { recursive: true });
mkdirSync("/opt/cursor/artifacts/screenshots/pr17-school", { recursive: true });

const palette = new Set([
  "27,26,36",
  "61,61,74",
  "233,223,199",
  "143,86,59",
  "79,53,46",
  "210,140,64",
  "242,193,78",
  "133,69,80",
  "53,102,189",
  "9,56,142",
  "33,34,60",
  "79,81,120",
]);

async function keep(page: Page, name: string) {
  const path = `${pr17}/${name}.png`;
  await page.screenshot({ path, animations: "disabled" });
  copyFileSync(path, `/opt/cursor/artifacts/screenshots/pr17-school/${name}.png`);
  return path;
}

async function size(page: Page, project: string) {
  if (project === "tablet-portrait") await page.setViewportSize({ width: 1000, height: 1600 });
  if (project === "tablet-landscape") await page.setViewportSize({ width: 1600, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
}

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePng(buf: Buffer) {
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 6;
  const idat: Buffer[] = [];
  while (offset + 8 <= buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9] ?? 6;
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + len;
  }
  const bpp = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const rows: Buffer[] = [];
  let src = 0;
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[src] ?? 0;
    src += 1;
    const row = Buffer.alloc(stride);
    for (let i = 0; i < stride; i += 1) {
      const x = raw[src + i] ?? 0;
      const a = i >= bpp ? (row[i - bpp] ?? 0) : 0;
      const b = prev[i] ?? 0;
      const c = i >= bpp ? (prev[i - bpp] ?? 0) : 0;
      let value = x;
      if (filter === 1) value = (x + a) & 255;
      else if (filter === 2) value = (x + b) & 255;
      else if (filter === 3) value = (x + Math.floor((a + b) / 2)) & 255;
      else if (filter === 4) value = (x + paeth(a, b, c)) & 255;
      row[i] = value;
    }
    src += stride;
    rows.push(row);
    prev = row;
  }
  return { width, height, bpp, rows };
}

function bottomColors(path: string) {
  const { width, height, bpp, rows } = decodePng(readFileSync(path));
  const colors = new Set<string>();
  const y0 = Math.max(0, height - 20);
  const x0 = Math.floor(width * 0.35);
  const x1 = Math.floor(width * 0.65);
  for (let y = y0; y < height; y += 1) {
    const row = rows[y];
    if (!row) continue;
    for (let x = x0; x < x1; x += 4) {
      const i = x * bpp;
      const r = row[i] ?? 0;
      const g = row[i + 1] ?? 0;
      const b = row[i + 2] ?? 0;
      const a = bpp === 4 ? (row[i + 3] ?? 255) : 255;
      if (a < 250) continue;
      colors.add(`${r},${g},${b}`);
    }
  }
  return [...colors];
}

async function expectFlat(page: Page) {
  const transform = await page.locator(".paper-slot").evaluate((el) => getComputedStyle(el).transform);
  expect(transform).toBe("none");
}

async function textInset(page: Page, selector: string) {
  return page.locator(selector).evaluate((el) => {
    const box = el.getBoundingClientRect();
    const paper = el.closest(".paper")?.getBoundingClientRect();
    if (!paper) return { left: 0, right: 0, top: 0 };
    return {
      left: box.left - paper.left,
      right: paper.right - box.right,
      top: box.top - paper.top,
    };
  });
}

test.describe("school desk and ponder focus", () => {
  test("the idle desk keeps a flat sheet, an on-palette book, and no grey bar", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj !== "tablet-portrait" && proj !== "desktop", "tablet and desktop shots");
    await size(page, proj);
    await page.goto("/learn/reading-room");
    await expect(page.locator(".learn-room")).toHaveAttribute("data-ready", "true");
    await expect(page.locator(".learn-room")).toHaveAttribute("data-focus", "room");
    await expect(page.locator(".learn-room")).toHaveAttribute("data-paper", "desk");
    await expect(page.locator(".paper")).toHaveAttribute("data-ink", "ready");
    await expectFlat(page);

    const deskPlane = await page.locator(".desk-top").evaluate((el) => getComputedStyle(el).transform);
    expect(deskPlane).not.toBe("none");
    await expect(page.locator(".ink-margin")).toHaveCSS("background-color", "rgb(33, 34, 60)");
    await expect(page.locator(".ink-margin")).toHaveCSS("width", "4px");
    await expect(page.locator(".ink-rest")).toBeVisible();
    const idleInset = await textInset(page, ".ponder-preview");
    expect(idleInset.left).toBeGreaterThanOrEqual(40);
    expect(idleInset.right).toBeGreaterThanOrEqual(36);
    expect(idleInset.top).toBeGreaterThanOrEqual(24);

    const paper = await page.locator(".paper-slot").boundingBox();
    const book = await page.locator(".book-prop").boundingBox();
    if (!paper || !book) throw new Error("desk props missing");
    expect(book.x).toBeGreaterThanOrEqual(paper.x + paper.width - 8);
    expect(book.width).toBeGreaterThanOrEqual(48);
    expect(book.height).toBeGreaterThanOrEqual(48);

    const painted = await page.locator(".book-prop canvas").evaluate((canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return { navy: 0, sky: 0, paper: 0, otherBlue: 0 };
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let navy = 0;
      let sky = 0;
      let paper = 0;
      let otherBlue = 0;
      for (let i = 0; i < data.length; i += 4) {
        if ((data[i + 3] ?? 0) === 0) continue;
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        if (r === 9 && g === 56 && b === 142) navy += 1;
        else if (r === 53 && g === 102 && b === 189) sky += 1;
        else if (r === 233 && g === 223 && b === 199) paper += 1;
        else if (b > r + 30 && b > g + 10) otherBlue += 1;
      }
      return { navy, sky, paper, otherBlue };
    });
    expect(painted.navy).toBeGreaterThan(painted.sky);
    expect(painted.sky).toBeGreaterThan(0);
    expect(painted.paper).toBeGreaterThan(0);
    expect(painted.otherBlue).toBe(0);

    const filters = await page.locator(".learn-room, .learn-room *").evaluateAll((nodes) =>
      nodes
        .map((node) => {
          const style = getComputedStyle(node);
          return { filter: style.filter, backdrop: style.backdropFilter };
        })
        .filter((row) => row.filter !== "none" || (row.backdrop && row.backdrop !== "none")),
    );
    expect(filters).toEqual([]);

    const shot = await keep(page, `desk-idle-${proj}`);
    const stray = bottomColors(shot).filter((color) => !palette.has(color));
    expect(stray, stray.join("\n")).toEqual([]);
  });

  test("lifting the sheet focuses it and leaves the vault alone until keep", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj !== "tablet-portrait" && proj !== "desktop", "tablet and desktop shots");
    test.setTimeout(90_000);
    await size(page, proj);
    await page.goto("/learn/reading-room");
    await expect(page.locator(".learn-room")).toHaveAttribute("data-ready", "true");
    const heading = page.getByRole("heading", { name: "Ponder" });
    if (proj === "tablet-portrait") await heading.tap();
    else await heading.click();
    await expect(page.locator(".learn-room")).toHaveAttribute("data-focus", "sheet");
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "lifted");
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-still", "true");
    await expectFlat(page);
    await expect(page.locator(".study-world")).toBeHidden();
    await expect(page.locator(".book-prop")).toBeHidden();
    await expect(page.locator(".lamp-spot")).toBeHidden();
    await expect(page.locator(".key-prop")).toBeHidden();
    await expect(page.getByRole("button", { name: "Back" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Set it down" })).toBeVisible();
    await expect(page.locator(".ink-rest")).toBeVisible();
    await expect(page.locator(".ink-margin")).toBeVisible();
    const liftedInset = await textInset(page, "#ponder-note");
    expect(liftedInset.left).toBeGreaterThanOrEqual(40);
    expect(liftedInset.right).toBeGreaterThanOrEqual(36);
    const motions = await page.locator(".paper-slot").evaluate((el) => el.getAnimations().length);
    expect(motions).toBe(0);

    const shot = await keep(page, `ponder-lifted-${proj}`);
    const stray = bottomColors(shot).filter((color) => !palette.has(color));
    expect(stray, stray.join("\n")).toEqual([]);

    if (proj !== "desktop") return;
    await page.getByRole("textbox", { name: "Your note" }).fill("A line left on the sheet.");
    await page.getByRole("button", { name: "Set it down" }).click();
    await expect(page.locator(".learn-room")).toHaveAttribute("data-focus", "room");
    await expect(page.locator(".study-world")).toBeVisible();
    await expect(page.locator(".book-prop")).toBeVisible();
    await expect(page.getByText("A line left on the sheet.")).toBeVisible();
    const beforeKeep = await page.evaluate(async () => {
      const open = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open("FounderOSLocalDB");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const count = (name: string) =>
        new Promise<number>((resolve, reject) => {
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
    expect(beforeKeep).toEqual({ human: 0, machine: 0 });

    await page.getByRole("heading", { name: "Ponder" }).click();
    await page.getByRole("button", { name: "Keep this note" }).click();
    await expect(page.getByRole("status")).toHaveText("Kept with your notes.");
    const afterKeep = await page.evaluate(async () => {
      const open = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open("FounderOSLocalDB");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const count = (name: string) =>
        new Promise<number>((resolve, reject) => {
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
    expect(afterKeep).toEqual({ human: 1, machine: 0 });
  });

  test("grayscale still reads the desk and the focused sheet", async ({ page }, info) => {
    test.skip(info.project.name !== "tablet-portrait", "one grayscale sheet");
    await size(page, "tablet-portrait");
    await page.goto("/learn/reading-room");
    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    await expect(page.getByRole("heading", { name: "Ponder" })).toBeVisible();
    await expect(page.getByText("A blank sheet. Lift it to write.")).toBeVisible();
    await expect(page.locator(".lamp-spot .status-chip")).toContainText("Working");
    await expect(page.getByRole("button", { name: "Open the current path" })).toBeVisible();
    await expect(page.locator(".ink-margin")).toBeVisible();
    await page.getByRole("heading", { name: "Ponder" }).tap();
    await expect(page.locator(".learn-room")).toHaveAttribute("data-focus", "sheet");
    await expect(page.locator(".study-world")).toBeHidden();
    await expect(page.getByRole("textbox", { name: "Your note" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Set it down" })).toBeVisible();
    await expect(page.locator(".ink-rest")).toBeVisible();
  });
});
