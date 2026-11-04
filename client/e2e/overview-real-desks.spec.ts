import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const shotDir = "../docs/shots/overview-real-desks";
const artifactDir = "/opt/cursor/artifacts/screenshots/overview-real-desks";
mkdirSync(shotDir, { recursive: true });
mkdirSync(artifactDir, { recursive: true });

type Box = { x: number; y: number; width: number; height: number };

async function boxOf(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`missing box for ${selector}`);
  return box;
}

function inside(inner: Box, outer: Box, slop = 1.5) {
  return (
    inner.x >= outer.x - slop &&
    inner.y >= outer.y - slop &&
    inner.x + inner.width <= outer.x + outer.width + slop &&
    inner.y + inner.height <= outer.y + outer.height + slop
  );
}

/** The seat crosses the desk top's back edge instead of floating above it. */
function overlapsBackEdge(seat: Box, top: Box) {
  const back = top.y;
  return seat.y < back - 0.5 && seat.y + seat.height > back + 0.5;
}

/** Touching edges are not an overlap. */
function intersects(a: Box, b: Box) {
  return a.x < b.x + b.width - 1 && a.x + a.width > b.x + 1 && a.y < b.y + b.height - 1 && a.y + a.height > b.y + 1;
}

/**
 * The single desk draws this bust at scale 8 (128px) on a desk that is at most
 * about 800px wide, so the employee reads at ~0.16 of the desk. Same bust here.
 */
const MIN_SPRITE_TO_DESK = 0.16;

async function keep(page: Page, name: string) {
  const path = `${shotDir}/${name}.png`;
  await page.screenshot({ path, animations: "disabled" });
  copyFileSync(path, `${artifactDir}/${name}.png`);
}

async function openOverview(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/team/hale-design-lab");
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.locator(".overview-desk")).toHaveCount(3);
}

async function assertFitted(page: Page) {
  const desks = page.locator(".agent-desk");
  const count = await desks.count();
  expect(count).toBeGreaterThan(0);
  const windows = await boxOf(page, ".desk-room-windows");
  const room = await boxOf(page, ".desk-room");
  const bays = await page.locator(".wall-bay").evaluateAll((els) =>
    els.map((el) => {
      const box = el.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    }),
  );
  let contentTop = Number.POSITIVE_INFINITY;
  let contentBottom = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < count; index += 1) {
    const desk = desks.nth(index);
    const top = await desk.locator(".desk-top").boundingBox();
    const paper = await desk.locator(".overview-paper").boundingBox();
    const seat = await desk.locator(".agent-figure").boundingBox();
    const sprite = await desk.locator(".agent-figure canvas").first().boundingBox();
    const chip = await desk.locator(".overview-state .status-chip").boundingBox();
    const rig = await desk.locator(".overview-desk").boundingBox();
    const plaque = await desk.locator(".agent-desk-plaque").boundingBox();
    if (!top || !paper || !seat || !sprite || !chip || !rig || !plaque) throw new Error("desk parts missing");
    expect(inside(paper, top), JSON.stringify({ paper, top })).toBe(true);
    expect(overlapsBackEdge(seat, top), JSON.stringify({ seat, top })).toBe(true);
    expect(intersects(chip, sprite), JSON.stringify({ chip, sprite })).toBe(false);
    expect(sprite.height).toBeGreaterThanOrEqual(rig.width * MIN_SPRITE_TO_DESK);
    expect(top.y).toBeGreaterThanOrEqual(windows.y + windows.height - 2);
    for (const bay of bays) {
      const overlap =
        top.x < bay.x + bay.width - 2 &&
        top.x + top.width > bay.x + 2 &&
        top.y < bay.y + bay.height - 2 &&
        top.y + top.height > bay.y + 2;
      expect(overlap, JSON.stringify({ top, bay })).toBe(false);
    }
    const line = desk.locator(".overview-line");
    await expect(line).toBeVisible();
    const text = await line.evaluate((node) => {
      const style = getComputedStyle(node);
      const host = node.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(node);
      const tops: number[] = [];
      const heights: number[] = [];
      for (const rect of range.getClientRects()) {
        if (rect.width < 1 || rect.height < 1) continue;
        if (rect.bottom <= host.top + 1 || rect.top >= host.bottom - 1) continue;
        heights.push(rect.height);
        if (!tops.some((top) => Math.abs(top - rect.top) < 1)) tops.push(rect.top);
      }
      return {
        lines: tops.length,
        minHeight: heights.length ? Math.min(...heights) : 0,
        fontSize: Number.parseFloat(style.fontSize),
        lineHeight: style.lineHeight,
        whiteSpace: style.whiteSpace,
        clamp: style.getPropertyValue("-webkit-line-clamp"),
        clientWidth: node.clientWidth,
        clientHeight: node.clientHeight,
        paper: node.closest(".overview-paper")?.getBoundingClientRect().height ?? 0,
        deskTop: node.closest(".desk-top")?.getBoundingClientRect().height ?? 0,
        rig: node.closest(".overview-desk")?.getBoundingClientRect().height ?? 0,
        sample: (node.textContent ?? "").trim(),
        overflow: node.scrollWidth > node.clientWidth + 1 && node.clientWidth < 8,
      };
    });
    expect(text.overflow).toBe(false);
    expect(text.whiteSpace).not.toContain("nowrap");
    expect(Number.parseFloat(text.clamp)).toBe(3);
    if (text.sample.length >= 40) {
      expect(text.lines, JSON.stringify(text)).toBeGreaterThanOrEqual(2);
      expect(text.lines, JSON.stringify(text)).toBeLessThanOrEqual(3);
      const lineBox = Number.parseFloat(text.lineHeight);
      expect(text.clientHeight, JSON.stringify(text)).toBeGreaterThanOrEqual(lineBox * 2 - 2);
      expect(text.paper, JSON.stringify(text)).toBeGreaterThanOrEqual(text.clientHeight - 1);
      expect(text.minHeight).toBeGreaterThanOrEqual(text.fontSize - 1);
    }
    contentTop = Math.min(contentTop, sprite.y, top.y);
    contentBottom = Math.max(contentBottom, plaque.y + plaque.height, top.y + top.height);
  }
  const viewport = page.viewportSize();
  if (viewport?.width === 800 && viewport.height === 1280) {
    expect((contentTop - room.y) / room.height).toBeLessThanOrEqual(0.5);
    expect((contentBottom - contentTop) / room.height).toBeGreaterThan(0.5);
  }
}

async function applyTiles(page: Page, count: number) {
  const radio = page.getByRole("radio", { name: `${count} tiles` });
  if ((await radio.count()) > 0) {
    await radio.click();
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-tiles", String(count));
    return;
  }
  await page.evaluate((next) => {
    localStorage.setItem("founder-os.desk-tiles", JSON.stringify({ count: next }));
  }, count);
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.locator(".agent-desk").first()).toBeVisible();
}

test.describe("overview desks match the fitted desk", () => {
  test("paper stays on the desk and the agent sits on the back edge", async ({ page }, info) => {
    test.skip(info.project.name === "desktop-video", "visual projects only");
    await openOverview(page);
    await assertFitted(page);

    const size = page.viewportSize();
    if (!size) throw new Error("viewport missing");
    const tag = `${size.width}x${size.height}`;
    await keep(page, `overview-${tag}`);
    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    await assertFitted(page);
    await keep(page, `overview-${tag}-grayscale`);
    await page.evaluate(() => {
      document.documentElement.style.filter = "";
    });

    const native = page.viewportSize();
    if (!native) throw new Error("viewport missing");
    for (const count of [2, 4, 3]) {
      await applyTiles(page, count);
      if (native.width >= 1100 && info.project.name === "desktop") {
        await expect(page.locator(".desk-grid")).toHaveAttribute("data-tiles", String(count));
      }
      await assertFitted(page);
    }

    if (info.project.name !== "desktop") return;

    const viewports = [
      { width: 1440, height: 900 },
      { width: 1024, height: 640 },
      { width: 800, height: 1280 },
      { width: 1280, height: 800 },
    ];
    for (const size of viewports) {
      await page.setViewportSize(size);
      if (size.width === 1024) {
        await expect(page.locator(".desk-grid")).toHaveAttribute("data-arrange", "strip");
      }
      for (const count of [2, 3, 4]) {
        await applyTiles(page, count);
        await assertFitted(page);
      }
      if (size.width !== 1024) continue;
      await applyTiles(page, 3);
      await keep(page, "overview-1024x640");
      await page.evaluate(() => {
        document.documentElement.style.filter = "grayscale(1)";
      });
      await assertFitted(page);
      await keep(page, "overview-1024x640-grayscale");
      await page.evaluate(() => {
        document.documentElement.style.filter = "";
      });
    }
  });

  test("clicking a paper walks into that agent's desk room", async ({ page }, info) => {
    test.skip(info.project.name === "desktop-video", "one interaction pass per layout");
    await openOverview(page);
    await page.locator(".agent-desk[data-agent='atelier'] .overview-paper").click();
    await expect(page.getByRole("heading", { name: "Atelier chat" })).toBeVisible();
    await expect(page.locator(".study")).toHaveAttribute("data-place", "chat");
    await expect(page.locator(".study-stage")).toHaveAttribute("data-approach", "near");
    await expect(page.locator(".study-stage")).toHaveAttribute("data-still", "true");
    await expect(page.locator(".overview-sheet")).toHaveCount(0);
    await expect(page.locator(".paper-log")).toBeVisible();
    await expect(page.getByText("The desk is quiet.")).toBeVisible();
    expect(await page.locator(".study-stage").evaluate((el) => el.getAnimations().length)).toBe(0);

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.locator(".agent-desk[data-agent='atelier']")).toBeFocused();
  });

  test("the keyboard walks into the focused desk", async ({ page }, info) => {
    test.skip(info.project.name === "tablet-landscape" || info.project.name === "desktop-video", "portrait and desktop");
    await openOverview(page);
    const courier = page.locator(".agent-desk[data-agent='courier']");
    await courier.focus();
    if (info.project.name === "desktop") {
      await page.keyboard.press("Enter");
      await expect(page.locator(".desk-grid")).toHaveAttribute("data-focus", "courier");
      await expect(page.locator(".overview-sheet")).toHaveCount(0);
    }
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Courier chat" })).toBeVisible();
    await expect(page.locator(".study-stage")).toBeVisible();
    await expect(page.locator(".overview-sheet")).toHaveCount(0);
    await expect(page.getByText("The lamp is out.")).toBeVisible();
  });

  test("a desk deep link still focuses that desk", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one deep-link pass");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/team/hale-design-lab?desk=atelier");
    await expect(page.locator(".study")).toHaveAttribute("data-deep-focus", "atelier");
    await expect(page.getByRole("heading", { name: "Atelier chat" })).toBeVisible();
    await expect(page.locator(".overview-sheet")).toBeVisible();
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-sheet", "open");

    await page.goto("/work/overview?agent=ceo");
    await expect(page.locator(".study")).toHaveAttribute("data-deep-focus", "ceo");
    await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
  });

  test("motion dollies the walk-up and reduced motion cuts it", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one motion check");
    await page.clock.install({ time: new Date("2026-10-29T12:00:00Z") });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/team/hale-design-lab");
    await page.getByRole("tab", { name: "Overview" }).click();
    await page.locator(".agent-desk[data-agent='ceo'] .overview-paper").click();
    await expect(page.locator(".study-stage")).toHaveAttribute("data-approach", "far");
    await expect(page.locator(".study-stage")).toHaveAttribute("data-still", "false");
    await page.clock.runFor(80);
    await expect(page.locator(".study-stage")).toHaveAttribute("data-approach", "near");
    await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
  });
});
