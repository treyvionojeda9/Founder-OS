import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

test("stylesheet keeps the flicker, the settle, and a shared plum press", () => {
  expect(css).toContain("animation: lamp-frame-0 1100ms linear infinite");
  expect(css).toContain("animation: lamp-frame-1 1100ms linear infinite");
  expect(css).toContain("animation: lamp-frame-2 1100ms linear infinite");
  expect(css).toContain("animation: paper-lift-settle 240ms steps(3, end)");
  expect(css).toContain("animation: paper-set-settle 240ms steps(3, end)");
  const reduce = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  const slow = css.slice(css.indexOf("@media (update: slow)"));
  expect(reduce).toContain(".lamp-frame");
  expect(reduce).toContain("animation: none");
  expect(slow).toContain("animation: none");
  for (const marker of [
    ".plaque:active",
    ".agent-desk:active .agent-desk-plaque",
    ".spine:active .spine-body",
    ".book-prop:active",
    ".stapler:active",
    '.tool-slip [role="menuitem"]:active',
    ".action-chip:hover",
  ]) {
    expect(css, marker).toContain(marker);
  }
  expect(css.slice(css.indexOf(".plaque:active"), css.indexOf(".plaque:active") + 180)).toContain("var(--plum)");
  expect(css.slice(css.lastIndexOf(".stapler:active"), css.lastIndexOf(".stapler:active") + 280)).toContain("var(--plum)");
  expect(css).not.toMatch(/10px 0 0 var\(--plum\)/);
});

const pr18 = "../docs/screenshots/pr18-p2";
mkdirSync(pr18, { recursive: true });
mkdirSync("/opt/cursor/artifacts/screenshots/pr18-p2", { recursive: true });

async function keep(page: Page, name: string) {
  const path = `${pr18}/${name}.png`;
  await page.screenshot({ path, animations: "allow" });
  copyFileSync(path, `/opt/cursor/artifacts/screenshots/pr18-p2/${name}.png`);
  return path;
}

async function size(page: Page, project: string) {
  if (project === "tablet-portrait") await page.setViewportSize({ width: 1000, height: 1600 });
  if (project === "desktop") await page.setViewportSize({ width: 1440, height: 900 });
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

function patchColors(path: string, box: { x: number; y: number; width: number; height: number }, dpr: number) {
  const { width, height, bpp, rows } = decodePng(readFileSync(path));
  const colors = new Set<string>();
  const x0 = Math.max(0, Math.floor(box.x * dpr));
  const y0 = Math.max(0, Math.floor(box.y * dpr));
  const x1 = Math.min(width, Math.ceil((box.x + box.width) * dpr));
  const y1 = Math.min(height, Math.ceil((box.y + box.height) * dpr));
  for (let y = y0; y < y1; y += 2) {
    const row = rows[y];
    if (!row) continue;
    for (let x = x0; x < x1; x += 2) {
      const i = x * bpp;
      const a = bpp === 4 ? (row[i + 3] ?? 255) : 255;
      if (a < 250) continue;
      colors.add(`${row[i] ?? 0},${row[i + 1] ?? 0},${row[i + 2] ?? 0}`);
    }
  }
  return [...colors];
}

async function openApproval(page: Page) {
  await page.goto("/team/hale-design-lab");
  await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
  await page.getByRole("button", { name: "Publish the forge note" }).click();
  await expect(page.getByRole("dialog", { name: "Approve this action?" })).toBeVisible();
}

test.describe("approval stamp over the live room", () => {
  test("the seal sits on the room and approve sends nothing", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj !== "tablet-portrait" && proj !== "desktop", "tablet and desktop shots");
    await size(page, proj);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const calls: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/api") || url.includes("/notes") || url.includes("/tasks")) calls.push(url);
    });
    await openApproval(page);

    await expect(page.locator("dialog")).toHaveCount(0);
    await expect(page.locator(".approval-overlay")).toHaveAttribute("data-approval", "overlay");
    await expect(page.locator(".study-world")).toBeVisible();
    await expect(page.locator(".lamp-spot")).toBeVisible();
    await expect(page.getByRole("img", { name: "CEO" })).toBeVisible();
    await expect(page.locator(".approval-slip")).toHaveCSS("background-color", "rgb(233, 223, 199)");
    await expect(page.locator(".approval-actions .approve")).toHaveCSS("background-color", "rgb(210, 140, 64)");

    const lamp = await page.locator(".lamp-spot canvas").boundingBox();
    const slip = await page.locator(".approval-slip").boundingBox();
    const ceo = await page.locator(".ceo-stand canvas").boundingBox();
    if (!lamp || !slip || !ceo) throw new Error("room or stamp missing");
    const clears = (box: { x: number; y: number; width: number; height: number }) =>
      box.y + box.height <= slip.y + 8 ||
      box.x + box.width <= slip.x + 8 ||
      box.x >= slip.x + slip.width - 8;
    expect(clears(lamp), "lamp stays outside the stamp").toBe(true);
    expect(clears(ceo), "figure stays outside the stamp").toBe(true);

    const filters = await page.locator(".approval-overlay, .approval-overlay *").evaluateAll((nodes) =>
      nodes
        .map((node) => getComputedStyle(node).filter)
        .filter((filter) => filter !== "none"),
    );
    expect(filters).toEqual([]);

    const spread = await page.locator(".approval-seal canvas").evaluate((canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return 0;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let min = 255;
      let max = 0;
      for (let i = 0; i < data.length; i += 4) {
        if ((data[i + 3] ?? 0) === 0) continue;
        const y = Math.round(0.299 * (data[i] ?? 0) + 0.587 * (data[i + 1] ?? 0) + 0.114 * (data[i + 2] ?? 0));
        min = Math.min(min, y);
        max = Math.max(max, y);
      }
      return max - min;
    });
    expect(spread).toBeGreaterThanOrEqual(40);

    const shot = await keep(page, `approval-overlay-${proj}`);
    const dpr = await page.evaluate(() => window.devicePixelRatio);
    const seen = patchColors(shot, lamp, dpr);
    const near = (color: string, r: number, g: number, b: number, slack: number) => {
      const [cr, cg, cb] = color.split(",").map(Number);
      return Math.abs((cr ?? 0) - r) <= slack && Math.abs((cg ?? 0) - g) <= slack && Math.abs((cb ?? 0) - b) <= slack;
    };
    expect(seen.some((color) => near(color, 143, 86, 59, 24) || near(color, 210, 140, 64, 24) || near(color, 242, 193, 78, 24))).toBe(
      true,
    );
    expect(seen.some((color) => near(color, 27, 26, 36, 8))).toBe(true);

    if (proj !== "tablet-portrait") return;
    const results = await new AxeBuilder({ page }).include(".approval-overlay").analyze();
    const bad = results.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
    expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);

    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("status")).toHaveText("Approved. Nothing ran.");
    await expect(page.locator(".ran-nothing")).toHaveAttribute("data-stamp", "approve");
    await expect(page.locator(".ran-nothing")).toHaveCSS("border-top-color", "rgb(210, 140, 64)");
    await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
    expect(calls).toEqual([]);
    const notes = await page.evaluate(async () => {
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
    expect(notes).toEqual({ human: 0, machine: 0 });
    await keep(page, "approval-stamp-tablet-portrait");
  });

  test("grayscale still reads the seal over the room", async ({ page }, info) => {
    test.skip(info.project.name !== "tablet-portrait", "one grayscale sheet");
    await size(page, "tablet-portrait");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openApproval(page);
    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    await expect(page.getByRole("heading", { name: "Approve this action?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Decline" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
    await expect(page.locator(".lamp-spot")).toBeVisible();
    await keep(page, "approval-overlay-grayscale-tablet-portrait");
  });
});

test.describe("working lamp and paper settle", () => {
  test("the working lamp holds, then flicks, and stays one frame when motion is reduced", async ({ page }, info) => {
    test.skip(info.project.name !== "tablet-portrait", "one lamp sheet");
    await size(page, "tablet-portrait");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/team/hale-design-lab");
    await expect(page.locator(".lamp-spot .lamp-flame")).toHaveAttribute("data-flicker", "still");
    await expect(page.locator(".lamp-spot .lamp-flame")).toHaveAttribute("data-frame", "0");
    await expect(page.locator(".lamp-spot .lamp-frame")).toHaveCount(1);
    await keep(page, "lamp-working-still-tablet-portrait");

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.reload();
    await expect(page.locator(".lamp-spot .lamp-flame")).toHaveAttribute("data-flicker", "on");
    await expect(page.locator(".lamp-spot .lamp-frame")).toHaveCount(3);
    await page.locator(".lamp-spot .lamp-frame").first().evaluate((el) => {
      const frames = el.parentElement?.querySelectorAll<HTMLElement>(".lamp-frame") ?? [];
      for (const frame of frames) {
        for (const animation of frame.getAnimations()) {
          animation.pause();
          animation.currentTime = 500;
        }
      }
    });
    await expect(page.locator('.lamp-spot .lamp-frame[data-frame="1"]')).toHaveCSS("opacity", "1");
    await expect(page.locator('.lamp-spot .lamp-frame[data-frame="0"]')).toHaveCSS("opacity", "0");
    await keep(page, "lamp-working-flicker-tablet-portrait");

    await page.locator(".lamp-spot .lamp-frame").first().evaluate((el) => {
      const frames = el.parentElement?.querySelectorAll<HTMLElement>(".lamp-frame") ?? [];
      for (const frame of frames) {
        for (const animation of frame.getAnimations()) {
          animation.pause();
          animation.currentTime = 980;
        }
      }
    });
    await expect(page.locator('.lamp-spot .lamp-frame[data-frame="2"]')).toHaveCSS("opacity", "1");
    await keep(page, "lamp-working-flicker-dip-tablet-portrait");
  });

  test("the sheet settles on the way up and on the way down", async ({ page }, info) => {
    test.skip(info.project.name !== "tablet-portrait" && info.project.name !== "desktop", "tablet and desktop");
    const proj = info.project.name;
    await size(page, proj);
    await page.clock.install({ time: new Date("2026-10-30T12:00:00Z") });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/team/hale-design-lab");
    await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
    await page.clock.pauseAt(new Date("2026-10-30T12:00:01Z"));
    await page.getByRole("heading", { name: "CEO chat" }).click();
    const slot = page.locator(".paper-slot");
    await expect(slot).toHaveAttribute("data-settle", "lift");
    await expect(slot).toHaveAttribute("data-pose", "lifted");
    await slot.evaluate((el) => {
      for (const animation of el.getAnimations()) {
        animation.pause();
        animation.currentTime = 80;
      }
    });
    if (proj === "tablet-portrait") await keep(page, "paper-settle-lift-tablet-portrait");
    if (proj === "desktop") await keep(page, "paper-settle-lift-desktop");

    await page.clock.runFor(400);
    await expect(slot).not.toHaveAttribute("data-settle");
    await expect(slot).toHaveAttribute("data-pose", "lifted");
    if (proj === "tablet-portrait") await keep(page, "paper-settled-lifted-tablet-portrait");

    await page.getByRole("button", { name: "Set it down" }).click();
    await expect(slot).toHaveAttribute("data-settle", "set");
    await expect(slot).toHaveAttribute("data-pose", "desk");
    await slot.evaluate((el) => {
      for (const animation of el.getAnimations()) {
        animation.pause();
        animation.currentTime = 80;
      }
    });
    if (proj === "tablet-portrait") await keep(page, "paper-settle-set-tablet-portrait");
    if (proj === "desktop") await keep(page, "paper-settle-set-desktop");
  });

  test("reduced motion cuts the lamp and the sheet to one frame", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one cut");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/team/hale-design-lab");
    const slot = page.locator(".paper-slot");
    await expect(slot).toHaveAttribute("data-still", "true");
    await expect(page.locator(".lamp-spot .lamp-flame")).toHaveAttribute("data-flicker", "still");
    await page.getByRole("heading", { name: "CEO chat" }).click();
    await expect(slot).toHaveAttribute("data-pose", "lifted");
    await expect(slot).not.toHaveAttribute("data-settle");
    expect(await slot.evaluate((el) => el.getAnimations().length)).toBe(0);
    expect(await page.locator(".lamp-spot .lamp-frame").evaluate((el) => el.getAnimations().length)).toBe(0);
  });
});
