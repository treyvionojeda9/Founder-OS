import { expect, test, type Page } from "@playwright/test";
import { ENTER_MS, SHUT_MS } from "../src/hall/doorMotion";

async function boxOf(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`missing box for ${selector}`);
  return box;
}

test.describe("agent desk", () => {
  test("the paper lies on a desk that fits the viewport", async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/team/hale-design-lab");
    await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
    await expect(page.locator(".study-stage")).toHaveAttribute("data-approach", "near");
    await expect(page.locator(".desk-rig")).toHaveAttribute("data-desk", "fitted");
    await expect(page.locator(".desk-side")).toBeVisible();
    await expect(page.locator(".desk-shadow")).toBeVisible();
    await expect(page.locator(".ceo-seat")).toHaveAttribute("data-pose", "seated");
    await expect(page.getByRole("img", { name: "CEO" })).toBeVisible();

    const viewport = page.viewportSize();
    const desk = await boxOf(page, ".desk-rig");
    const top = await boxOf(page, ".desk-top");
    const paper = await boxOf(page, ".paper");
    if (!viewport) throw new Error("viewport missing");
    const ratio = desk.width / viewport.width;
    expect(ratio).toBeGreaterThanOrEqual(0.4);
    expect(ratio).toBeLessThanOrEqual(0.55);
    expect(paper.x).toBeGreaterThanOrEqual(top.x - 1);
    expect(paper.y).toBeGreaterThanOrEqual(top.y - 1);
    expect(paper.x + paper.width).toBeLessThanOrEqual(top.x + top.width + 1);
    expect(paper.y + paper.height).toBeLessThanOrEqual(top.y + top.height + 1);

    const fontSize = await page.locator(".machine-line > p").first().evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(info.project.name === "desktop" ? 16 : 18);
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "desk");
    await expect(page.locator("[data-approval='inline']")).toBeVisible();
    await expect(page.locator(".approval-overlay")).toHaveCount(0);
  });

  test("inline approve, decline, and the docked composer work without lifting", async ({ page }, info) => {
    test.skip(info.project.name === "tablet-landscape", "portrait and desktop cover the sheet");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/team/hale-design-lab");
    const last = page.locator(".machine-line").last();
    await expect(last).toContainText("I can publish the forge note");
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "desk");

    const approve = page.locator("[data-approval='inline'] [data-choice='approve']");
    const box = await approve.boundingBox();
    expect(box && box.width >= 44 && box.height >= 44).toBe(true);
    await approve.click();
    await expect(page.locator(".approval-overlay")).toHaveCount(0);
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "desk");
    await expect(page.getByRole("status")).toHaveText("Approved. Nothing ran.");

    await page.reload();
    await page.locator("[data-approval='inline'] [data-choice='decline']").click();
    await expect(page.locator(".approval-overlay")).toHaveCount(0);
    await expect(page.getByRole("status")).toHaveText("Declined. Nothing ran.");

    const composer = page.getByLabel("Message the CEO");
    await composer.click();
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "desk");
    await composer.fill("Hold the forge note.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.locator(".founder-line", { hasText: "Hold the forge note." })).toBeVisible();
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "desk");
  });

  test("keyboard reaches approve and the composer on the paper", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one keyboard pass");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/team/hale-design-lab");
    await page.locator("[data-approval='inline'] [data-choice='approve']").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toHaveText("Approved. Nothing ran.");
    await expect(page.locator(".approval-overlay")).toHaveCount(0);

    await page.reload();
    const composer = page.getByLabel("Message the CEO");
    await composer.focus();
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "desk");
    await page.keyboard.type("Noted from the keys.");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Send" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator(".founder-line", { hasText: "Noted from the keys." })).toBeVisible();
  });

  test("reduced motion cuts the walk-up and motion dollies in", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one motion check");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/team/hale-design-lab");
    await expect(page.locator(".study-stage")).toHaveAttribute("data-approach", "near");
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-still", "true");
    expect(await page.locator(".study-stage").evaluate((el) => el.getAnimations().length)).toBe(0);

    await page.clock.install({ time: new Date("2026-10-29T12:00:00Z") });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/team/hale-design-lab");
    await expect(page.locator(".study-stage")).toHaveAttribute("data-approach", "far");
    await page.clock.runFor(80);
    await expect(page.locator(".study-stage")).toHaveAttribute("data-approach", "near");
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-still", "false");
  });
});

test("the leftmost work door frame stays on the door", async ({ page }, info) => {
  test.skip(info.project.name === "tablet-landscape", "portrait and desktop");
  test.setTimeout(90_000);
  await page.clock.install({ time: new Date("2026-10-29T12:00:00Z") });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/home");
  await expect(page.locator("[data-hall=void]")).toBeVisible();
  await page.clock.pauseAt(new Date("2026-10-29T12:00:03Z"));

  const hale = page.getByRole("button", { name: "Open Hale Design Lab" });
  const yaw = await hale.evaluate((el) => Number.parseFloat(getComputedStyle(el).getPropertyValue("--yaw")));
  expect(yaw).not.toBe(0);
  const cloudYaw = await page
    .locator("[data-door-id='cloud-agent-team']")
    .evaluate((el) => Number.parseFloat(getComputedStyle(el).getPropertyValue("--yaw")));
  expect(cloudYaw).toBe(0);

  await hale.click();
  await expect(page.locator(".room-portal-layer")).toBeVisible();
  const frame = await page.locator(".room-portal-layer").evaluate((el) => {
    const style = getComputedStyle(el);
    const ox = Number.parseFloat(style.getPropertyValue("--ox"));
    const openW = Number.parseFloat(style.getPropertyValue("--open-w"));
    return { ox, openW, width: window.innerWidth };
  });
  expect(frame.ox - frame.openW / 2).toBeGreaterThanOrEqual(-1);
  expect(frame.ox + frame.openW / 2).toBeLessThanOrEqual(frame.width + 1);
  const rig = await boxOf(page, "[data-door-id='hale-design-lab'] .door-rig");
  expect(Math.abs(frame.ox - (rig.x + rig.width / 2))).toBeLessThan(rig.width);

  await page.clock.runFor(ENTER_MS + 200);
  await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
  await page.getByRole("button", { name: "Back" }).click();
  const ghost = page.locator(".door-ghost");
  await expect(ghost).toBeVisible();
  const ghostTransform = await ghost.evaluate((el) => el.style.transform);
  expect(ghostTransform).toContain("rotateY");
  expect(ghostTransform).not.toContain("rotateY(0deg)");
  const ghostBox = await ghost.boundingBox();
  const doorBox = await page.locator("[data-door-id='hale-design-lab'] .door-rig").boundingBox();
  if (!ghostBox || !doorBox) throw new Error("ghost or door missing");
  const overlap = Math.min(ghostBox.x + ghostBox.width, doorBox.x + doorBox.width) - Math.max(ghostBox.x, doorBox.x);
  expect(overlap).toBeGreaterThan(doorBox.width * 0.45);
  expect(ghostBox.x).toBeGreaterThanOrEqual(-8);
  await page.clock.runFor(SHUT_MS + 200);
  await expect(page).toHaveURL(/\/home$/);
  await expect(hale).toBeFocused();
});
