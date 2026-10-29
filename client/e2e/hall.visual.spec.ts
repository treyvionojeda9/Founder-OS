import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { ENTER_MS, SEQUENCE_MS, SHUT_MS } from "../src/hall/doorMotion";

const dir = "/opt/cursor/artifacts/screenshots";
const pr3 = "../docs/screenshots/pr3";
const pr3Art = "/opt/cursor/artifacts/screenshots/pr3";
mkdirSync(dir, { recursive: true });
mkdirSync(pr3, { recursive: true });
mkdirSync(pr3Art, { recursive: true });

async function keep(page: Page, name: string) {
  const path = `${pr3}/${name}.png`;
  await page.screenshot({ path, animations: "allow" });
  copyFileSync(path, `${pr3Art}/${name}.png`);
}

async function expectStage(page: Page, count: number) {
  const grid = page.locator(".door-grid");
  await expect(grid).toHaveAttribute("data-count", String(count));
  await expect(page.locator(".door")).toHaveCount(count);
  const gridBox = await grid.boundingBox();
  const stage = await page.locator(".stage").boundingBox();
  const head = await page.locator(".stage-head").boundingBox();
  if (!gridBox || !stage || !head) throw new Error("hall boxes missing");
  const centerX = gridBox.x + gridBox.width / 2;
  const stageCenter = stage.x + stage.width / 2;
  expect(Math.abs(centerX - stageCenter)).toBeLessThan(80);
  const toggle = (await page.locator(".toggle-dock").count())
    ? await page.locator(".toggle-dock").boundingBox()
    : null;
  const lower = toggle ? toggle.y : stage.y + stage.height;
  const bandMid = (head.y + head.height + lower) / 2;
  const centerY = gridBox.y + gridBox.height / 2;
  expect(Math.abs(centerY - bandMid)).toBeLessThan(110);

  const perspective = await page.locator(".door-wrap").evaluate((el) => getComputedStyle(el).perspective);
  expect(perspective).not.toBe("none");
  const preserve = await page.locator(".door-rig").first().evaluate((el) => getComputedStyle(el).transformStyle);
  expect(preserve).toBe("preserve-3d");
  const leafOrigin = await page.locator(".leaf").first().evaluate((el) => getComputedStyle(el).transformOrigin);
  expect(leafOrigin.startsWith("0px")).toBe(true);
  const dolly = await page
    .locator(".dolly-target")
    .nth(count >= 3 ? 1 : 0)
    .evaluate((el) => {
      const [x, y] = getComputedStyle(el).transformOrigin.split(" ").map((part) => Number.parseFloat(part));
      return { x, y, w: el.offsetWidth, h: el.offsetHeight };
    });
  expect(Math.abs(dolly.x - dolly.w / 2)).toBeLessThan(3);
  expect(Math.abs(dolly.y - dolly.h / 2)).toBeLessThan(3);

  if (count >= 3) {
    const poses = await page.locator(".door-slot").evaluateAll((nodes) =>
      nodes.map((node) => ({
        yaw: Number(node.getAttribute("data-yaw")),
        z: Number(node.getAttribute("data-z")),
      })),
    );
    expect(poses[0].yaw).toBeGreaterThan(0);
    expect(poses[1].yaw).toBe(0);
    expect(poses[2].yaw).toBeLessThan(0);
    expect(poses[0].z).toBeLessThan(0);
    expect(poses[2].z).toBeLessThan(0);
    expect(poses[1].z).toBe(0);
  } else {
    const yaws = await page.locator(".door-slot").evaluateAll((nodes) =>
      nodes.map((node) => Number(node.getAttribute("data-yaw"))),
    );
    expect(yaws.every((yaw) => yaw === 0)).toBe(true);
  }
}

async function seek(page: Page, ms: number) {
  await page.evaluate((time) => {
    for (const animation of document.getAnimations()) {
      animation.pause();
      animation.currentTime = time;
    }
  }, ms);
}

test.describe("closed hall", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  for (const count of [1, 2, 3]) {
    test(`${count} doors sit centered on the stage`, async ({ page }, info) => {
      await page.goto(count === 3 ? "/home" : `/home?count=${count}`);
      await expect(page.getByRole("button", { name: /Hale Design Lab/ })).toBeVisible();
      await expectStage(page, count);
      await page.screenshot({
        path: `${dir}/hall-closed-${count}-${info.project.name}.png`,
        animations: "disabled",
      });
      if (count === 3) await keep(page, `hall-closed-${info.project.name}`);
    });
  }

  test("grayscale closed hall keeps a visible focus ring", async ({ page }, info) => {
    test.skip(info.project.name !== "tablet-portrait", "one grayscale sheet");
    await page.goto("/home");
    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    await page.locator(".stage-settings").focus();
    await page.keyboard.press("Tab");
    const door = page.getByRole("button", { name: /Hale Design Lab/ });
    await expect(door).toBeFocused();
    const outline = await door.evaluate((el) => {
      const style = getComputedStyle(el);
      return { color: style.outlineColor, width: style.outlineWidth, style: style.outlineStyle };
    });
    expect(outline.style).toBe("solid");
    expect(Number.parseFloat(outline.width)).toBeGreaterThanOrEqual(3);
    expect(outline.color).toBe("rgb(233, 223, 199)");
    await expect(page.locator(".contact-shadow").first()).toBeVisible();
    await expect(page.getByRole("tab", { name: "Work" })).toBeVisible();
    await page.screenshot({
      path: `${dir}/hall-closed-3-tablet-portrait-grayscale.png`,
      animations: "disabled",
    });
  });
});

test.describe("open frames", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-29T12:00:00Z") });
  });

  test("swing and dolly stay on the hall, then the route rises", async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/home");
    await expect(page.getByRole("button", { name: /Hale Design Lab/ })).toBeVisible();
    await page.clock.pauseAt(new Date("2026-10-29T12:00:03Z"));
    const door = page.getByRole("button", { name: /Hale Design Lab/ });
    await door.click();
    await expect(door).toHaveAttribute("data-phase", "swing");
    await expect(page).toHaveURL(/\/home$/);
    await expect
      .poll(async () =>
        page.evaluate(() => document.querySelector(".door.is-opening .leaf")?.getAnimations().length ?? 0),
      )
      .toBeGreaterThan(0);

    const frames: { label: string; ms: number }[] = [
      { label: "25", ms: Math.round(SEQUENCE_MS * 0.25) },
      { label: "50", ms: Math.round(SEQUENCE_MS * 0.5) },
      { label: "75", ms: Math.round(SEQUENCE_MS * 0.75) },
      { label: "100", ms: ENTER_MS - 16 },
    ];
    await expect(page.locator(".room-portal")).toBeVisible();
    const spill = await page.locator(".door.is-opening .spill").evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(spill)).toBe(0);

    for (const frame of frames) {
      await seek(page, frame.ms);
      await expect(page).toHaveURL(/\/home$/);
      if (frame.label === "100") {
        const scale = await page.locator(".room-portal").evaluate((el) => {
          const value = getComputedStyle(el).transform;
          if (value === "none") return 1;
          const match = value.match(/matrix(?:3d)?\(([^)]+)\)/);
          if (!match) return -1;
          return Number(match[1].split(",")[0]);
        });
        expect(scale).toBeGreaterThan(0.95);
      }
      await page.screenshot({
        path: `${dir}/door-open-${frame.label}-${info.project.name}.png`,
        animations: "allow",
      });
      await keep(page, `door-open-${frame.label}-${info.project.name}`);
    }

    await page.clock.runFor(ENTER_MS + 400);
    await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
    await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "desk");
    await page.screenshot({
      path: `${dir}/door-landed-${info.project.name}.png`,
      animations: "allow",
    });
    await keep(page, `room-landed-${info.project.name}`);
  });
});

test("grayscale lamp on and lamp off stay different shapes", async ({ page }, info) => {
  test.skip(info.project.name !== "tablet-portrait", "one grayscale pair");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/team/hale-design-lab");
  await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.filter = "grayscale(1)";
  });
  const lit = await lampSignature(page);
  await keep(page, "room-grayscale-lamp-on-tablet-portrait");
  await page.getByRole("tab", { name: "Atelier" }).click();
  await expect(page.getByRole("img", { name: "Desk lamp, dark" })).toBeVisible();
  const dark = await lampSignature(page);
  expect(dark).not.toBe(lit);
  await keep(page, "room-grayscale-lamp-off-tablet-portrait");
});

test("approval dialog sits on the paper", async ({ page }, info) => {
  test.skip(info.project.name !== "tablet-portrait", "one dialog sheet");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/team/hale-design-lab");
  await page.getByRole("button", { name: "Publish the forge note" }).click();
  await expect(page.getByRole("dialog", { name: "Approve this action?" })).toBeVisible();
  await keep(page, "approval-dialog-tablet-portrait");
  await page.getByRole("button", { name: "Decline" }).click();
  await expect(page.getByRole("status")).toHaveText("Declined. Nothing ran.");
  await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
});

test.describe("back through the doorway", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-29T12:00:00Z") });
  });

  test("the room recedes and the door closes onto the hall", async ({ page }, info) => {
    test.skip(info.project.name !== "tablet-portrait", "one reverse sheet");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/home");
    await page.clock.pauseAt(new Date("2026-10-29T12:00:03Z"));
    await page.getByRole("button", { name: /Hale Design Lab/ }).click();
    await page.clock.runFor(ENTER_MS + 500);
    await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
    await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.locator(".room-portal.is-shut")).toBeVisible();
    await seek(page, Math.round(SHUT_MS * 0.62));
    await keep(page, "back-mid-tablet-portrait");
    await page.clock.runFor(SHUT_MS + 200);
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("button", { name: /Hale Design Lab/ })).toBeFocused();
  });
});

async function lampSignature(page: Page) {
  return page.getByRole("img", { name: /Desk lamp/ }).evaluate((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let sig = 0;
    for (let i = 0; i < data.length; i += 16) sig = (sig + data[i] * 3 + data[i + 1] * 5 + data[i + 2]) % 100000;
    return String(sig);
  });
}
