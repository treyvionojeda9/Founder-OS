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

async function keep(page: Page, name: string) {
  const path = `${shotDir}/${name}.png`;
  await page.screenshot({ path, animations: "disabled" });
  copyFileSync(path, `${artifactDir}/${name}.png`);
}

async function openOverview(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/team/hale-design-lab");
  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.locator(".overview-desk")).toHaveCount(3);
}

async function assertFitted(page: Page) {
  const desks = page.locator(".agent-desk");
  const count = await desks.count();
  expect(count).toBeGreaterThan(0);
  const windows = await boxOf(page, ".desk-room-windows");
  const bays = await page.locator(".wall-bay").evaluateAll((els) =>
    els.map((el) => {
      const box = el.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    }),
  );
  for (let index = 0; index < count; index += 1) {
    const desk = desks.nth(index);
    const top = await desk.locator(".desk-top").boundingBox();
    const paper = await desk.locator(".overview-paper").boundingBox();
    const seat = await desk.locator(".agent-figure").boundingBox();
    if (!top || !paper || !seat) throw new Error("desk parts missing");
    expect(inside(paper, top), JSON.stringify({ paper, top })).toBe(true);
    expect(overlapsBackEdge(seat, top), JSON.stringify({ seat, top })).toBe(true);
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
    const overflow = await line.evaluate((node) => node.scrollWidth > node.clientWidth + 1 && node.clientWidth < 8);
    expect(overflow).toBe(false);
  }
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

    if (info.project.name !== "desktop") return;

    for (const count of [2, 4, 3]) {
      await page.getByRole("radio", { name: `${count} tiles` }).click();
      await expect(page.locator(".desk-grid")).toHaveAttribute("data-tiles", String(count));
      await assertFitted(page);
    }

    await page.setViewportSize({ width: 1024, height: 640 });
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-arrange", "strip");
    await assertFitted(page);
    await keep(page, "overview-1024x640");
    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    await assertFitted(page);
    await keep(page, "overview-1024x640-grayscale");
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
