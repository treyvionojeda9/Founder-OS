import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

const shotDir = "../docs/screenshots/ponder-ink";
const artifactDir = "/opt/cursor/artifacts/screenshots/ponder-ink";
mkdirSync(shotDir, { recursive: true });
mkdirSync(artifactDir, { recursive: true });

async function keep(page: Page, name: string) {
  const path = `${shotDir}/${name}.png`;
  await page.screenshot({ path, animations: "disabled" });
  copyFileSync(path, `${artifactDir}/${name}.png`);
}

async function openSheet(page: Page, project: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn/reading-room");
  await expect(page.locator(".learn-room")).toHaveAttribute("data-ready", "true");
  await expect(page.getByText("A blank sheet. Lift it to write.")).toBeVisible();
  const heading = page.getByRole("heading", { name: "Ponder" });
  if (project === "tablet-portrait") await heading.tap();
  else await heading.click();
  await expect(page.locator(".learn-room")).toHaveAttribute("data-focus", "sheet");
  await expect(page.locator(".paper-slot")).toHaveAttribute("data-still", "true");
  const ink = page.locator(".ink-page");
  await expect(ink).toHaveAttribute("data-ink-page", "live");
  await expect(ink).toHaveAttribute("data-ink-ready", "true");
  await expect(ink).toHaveAttribute("data-stroke-count", "0");
  await expect(ink).toHaveCSS("touch-action", "none");
  await expect(page.getByRole("textbox", { name: "Your note" })).toBeVisible();
  return ink;
}

async function pointer(
  ink: Locator,
  kind: "pen" | "touch" | "mouse",
  phase: "down" | "move" | "up",
  x: number,
  y: number,
  pressure: number,
) {
  await ink.evaluate(
    (el, input) => {
      const rect = el.getBoundingClientRect();
      el.dispatchEvent(
        new PointerEvent(
          input.phase === "down" ? "pointerdown" : input.phase === "move" ? "pointermove" : "pointerup",
          {
            bubbles: true,
            cancelable: true,
            pointerType: input.kind,
            pointerId: input.kind === "touch" ? 4 : 1,
            clientX: rect.left + input.x,
            clientY: rect.top + input.y,
            pressure: input.pressure,
            buttons: input.phase === "up" ? 0 : 1,
            button: 0,
            isPrimary: true,
          },
        ),
      );
    },
    { kind, phase, x, y, pressure },
  );
}

async function inkPixels(ink: Locator) {
  return ink.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let dark = 0;
    for (let i = 0; i < data.length; i += 4) {
      if ((data[i + 3] ?? 0) < 20) continue;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      if (r < 180 && g < 180) dark += 1;
    }
    return dark;
  });
}

async function vaultInk(page: Page) {
  return page.evaluate(async () => {
    const open = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("FounderOSLocalDB");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const all = (name: string) =>
      new Promise<unknown[]>((resolve, reject) => {
        const tx = open.transaction(name, "readonly");
        const req = tx.objectStore(name).getAll();
        req.onsuccess = () => resolve(req.result as unknown[]);
        req.onerror = () => reject(req.error);
      });
    const notes = (await all("humanNotes")) as { content: string; revision: number; vault: string }[];
    const ink = (await all("humanInk")) as { strokesJson: string; previewPng?: string; id: string }[];
    const machine = await new Promise<number>((resolve, reject) => {
      const tx = open.transaction("machineNotes", "readonly");
      const req = tx.objectStore("machineNotes").count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    open.close();
    return { notes, ink, machine };
  });
}

test.describe("ponder raw ink", () => {
  test("pen draws, touch pans, and reload keeps the strokes", async ({ page }, info) => {
    const project = info.project.name;
    test.skip(project !== "tablet-portrait" && project !== "desktop", "tablet portrait and desktop");
    test.setTimeout(90_000);
    const ink = await openSheet(page, project);
    await keep(page, `before-${project}`);
    expect(await inkPixels(ink)).toBe(0);

    await pointer(ink, "pen", "down", 36, 48, 0.25);
    await pointer(ink, "pen", "move", 90, 70, 0.75);
    await pointer(ink, "pen", "move", 130, 46, 0.125);
    await pointer(ink, "pen", "up", 150, 80, 0.25);
    await expect(ink).toHaveAttribute("data-ink-saved", "true");
    await expect(ink).toHaveAttribute("data-stroke-count", "1");
    expect(await inkPixels(ink)).toBeGreaterThan(0);

    const beforePan = await ink.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return "";
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let hash = 0;
      for (let i = 0; i < data.length; i += 16) hash = (hash + (data[i] ?? 0) * (i + 1)) % 1000003;
      return String(hash);
    });
    await pointer(ink, "touch", "down", 40, 40, 0.5);
    await pointer(ink, "touch", "move", 76, 58, 0.5);
    await pointer(ink, "touch", "up", 76, 58, 0);
    await expect(ink).toHaveAttribute("data-stroke-count", "1");
    await expect(ink).toHaveAttribute("data-pan-x", "36");
    await expect(ink).toHaveAttribute("data-pan-y", "18");
    const afterPan = await ink.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return "";
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let hash = 0;
      for (let i = 0; i < data.length; i += 16) hash = (hash + (data[i] ?? 0) * (i + 1)) % 1000003;
      return String(hash);
    });
    expect(afterPan).not.toBe(beforePan);
    expect(await inkPixels(ink)).toBeGreaterThan(0);

    await pointer(ink, "mouse", "down", 48, 100, 0.5);
    await pointer(ink, "mouse", "move", 110, 120, 0.5);
    await pointer(ink, "mouse", "up", 140, 110, 0.5);
    await expect(ink).toHaveAttribute("data-stroke-count", "2");
    await expect(ink).toHaveAttribute("data-ink-saved", "true");

    const stored = await vaultInk(page);
    expect(stored.machine).toBe(0);
    expect(stored.notes).toHaveLength(1);
    expect(stored.notes[0]?.vault).toBe("human");
    expect(stored.notes[0]?.content).toContain("source_type: ink");
    expect(stored.notes[0]?.content).toContain("ink_asset: INK-");
    expect(stored.ink).toHaveLength(1);
    const raw = stored.ink[0]?.strokesJson ?? "";
    const strokes = JSON.parse(raw) as { tool: string; points: { p?: number }[] }[];
    expect(strokes).toHaveLength(2);
    expect(strokes[0]?.tool).toBe("pen");
    expect(strokes[0]?.points.some((point) => point.p === 0.25 || point.p === 0.75 || point.p === 0.125)).toBe(true);
    expect(strokes[1]?.points.every((point) => point.p === undefined)).toBe(true);
    expect(stored.ink[0]?.previewPng?.startsWith("data:image/png")).toBe(true);
    expect(raw).not.toBe(stored.ink[0]?.previewPng);

    await keep(page, `after-${project}`);

    await page.reload();
    await expect(page.locator(".learn-room")).toHaveAttribute("data-ready", "true");
    const restored = page.locator(".ink-page");
    await expect(restored).toHaveAttribute("data-stroke-count", "2");
    await expect(restored).toHaveAttribute("data-ink-page", "rest");
    expect(await inkPixels(restored)).toBeGreaterThan(0);
    const heading = page.getByRole("heading", { name: "Ponder" });
    if (project === "tablet-portrait") await heading.tap();
    else await heading.click();
    await expect(page.locator(".ink-page")).toHaveAttribute("data-ink-page", "live");
    await expect(page.locator(".ink-page")).toHaveAttribute("data-stroke-count", "2");
    expect(await inkPixels(page.locator(".ink-page"))).toBeGreaterThan(0);
    await expect(page.getByRole("textbox", { name: "Your note" })).toBeVisible();
    const box = await page.locator(".ink-page").boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    const setDown = await page.getByRole("button", { name: "Set it down" }).boundingBox();
    expect(setDown?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test("measures emulated input-to-paint under 4x cpu", async ({ page }, info) => {
    test.skip(info.project.name !== "tablet-portrait", "tablet portrait 4x profile");
    test.setTimeout(90_000);
    const client = await page.context().newCDPSession(page);
    await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const ink = await openSheet(page, "tablet-portrait");
    await ink.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const fire = (type: string, x: number, y: number) => {
        el.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerType: "pen",
            pointerId: 3,
            clientX: rect.left + x,
            clientY: rect.top + 30 + (x % 5),
            pressure: 0.66,
            buttons: type === "pointerup" ? 0 : 1,
            button: 0,
            isPrimary: true,
          }),
        );
      };
      fire("pointerdown", 20, 30);
      for (let i = 1; i <= 40; i += 1) fire("pointermove", 20 + i * 3, 30);
      fire("pointerup", 20 + 41 * 3, 30);
    });
    const samples = await ink.evaluate((el) => {
      const list = (el as HTMLElement & { __inkPaintSamples?: number[] }).__inkPaintSamples ?? [];
      return list.slice();
    });
    expect(samples.length).toBeGreaterThanOrEqual(40);
    const sorted = [...samples].sort((a, b) => a - b);
    const at = (ratio: number) => sorted[Math.min(sorted.length - 1, Math.floor(ratio * (sorted.length - 1)))] ?? 0;
    const summary = {
      label: "emulated, not the TCL Note A1",
      profile: "Playwright Chromium, tablet portrait 800x1280, devicePixelRatio 2, CPU throttle 4x",
      segments: samples.length,
      minMs: at(0),
      medianMs: at(0.5),
      p95Ms: at(0.95),
      maxMs: at(1),
    };
    console.info(`INK_LATENCY ${JSON.stringify(summary)}`);
    expect(summary.medianMs).toBeLessThan(100);
    await expect(ink).toHaveAttribute("data-stroke-count", "1");
  });
});
