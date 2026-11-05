import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const pr8 = "../docs/screenshots/pr8";
mkdirSync(pr8, { recursive: true });
mkdirSync("/opt/cursor/artifacts/screenshots/pr8", { recursive: true });

async function keep(page: Page, name: string) {
  const path = `${pr8}/${name}.png`;
  await page.screenshot({ path, animations: "disabled" });
  copyFileSync(path, `/opt/cursor/artifacts/screenshots/pr8/${name}.png`);
}

async function land(page: Page, project: string) {
  if (project === "tablet-portrait") await page.setViewportSize({ width: 1000, height: 1600 });
  if (project === "tablet-landscape") await page.setViewportSize({ width: 1600, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/team/hale-design-lab");
  await page.getByRole("button", { name: "Team" }).click();
  await expect(page.locator(".team-board")).toHaveAttribute("data-count", "3");
  await expect(page.locator(".team-board")).toHaveAttribute("data-still", "true");
}

test.describe("work team board", () => {
  test("shows the roster, opens a chat, and Back stays in the study", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj === "desktop-video", "visual projects only");
    await land(page, proj);
    await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
    await expect(page.getByText("Hale Design Lab").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /CEO/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Atelier/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Courier/ })).toBeVisible();
    await expect(page.getByText("Founder")).toBeVisible();
    await expect(page.getByText("Swatch keeper")).toBeVisible();
    await expect(page.getByText("Errand runner")).toBeVisible();
    await expect(page.getByRole("img", { name: "Desk lamp, lit" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Desk lamp, dark" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Desk lamp, failed" })).toBeVisible();
    await expect(page.locator(".plaque[data-status='working']")).toContainText("Working");
    await expect(page.locator(".plaque[data-status='idle']")).toContainText("Idle");
    await expect(page.locator(".plaque[data-status='failed']")).toContainText("Failed");
    await expect(page.locator(".board-void")).toHaveCSS("perspective", /px/);
    await expect(page.locator(".board-hanger")).toHaveCSS("transform", /matrix/);
    const layout = await page.locator(".app").getAttribute("data-layout");
    if (proj === "tablet-portrait") expect(layout).toBe("portrait");
    if (proj === "tablet-landscape") expect(layout).toBe("landscape");
    if (proj === "desktop") expect(layout).toBe("desktop");
    const plaque = page.locator(".plaque").first();
    const plaqueBox = await plaque.boundingBox();
    expect(plaqueBox && plaqueBox.width >= 48 && plaqueBox.height >= 48).toBe(true);
    expect(await page.locator(".plaque").first().evaluate((el) => el.getAnimations().length)).toBe(0);
    await keep(page, `team-board-${proj}`);

    await page.getByRole("button", { name: "Stapler" }).click();
    await expect(page.getByRole("menu", { name: "Fixture tools" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Swatch sheet" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Forge stamp" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Errand slip" })).toBeVisible();
    await page.getByRole("menuitem", { name: "Forge stamp" }).click();
    await expect(page.getByText("Label only. Nothing left this board.")).toBeVisible();
    if (proj === "tablet-portrait") await keep(page, "team-tools-tablet-portrait");
    if (proj === "desktop") await keep(page, "team-tools-desktop");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu", { name: "Fixture tools" })).toHaveCount(0);

    await page.getByRole("button", { name: /Atelier/ }).click();
    await expect(page.getByRole("heading", { name: "Atelier chat" })).toBeVisible();
    await expect(page.locator(".machine-line").first()).toContainText("generated · not verified");
    await expect(page.getByRole("img", { name: "Desk lamp, dark" })).toBeVisible();
    await expect(page.locator(".team-board")).toHaveCount(0);
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-still", "true");
    if (proj === "tablet-portrait") await keep(page, "team-chat-tablet-portrait");

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
    await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
    await expect(page.locator(".team-board")).toHaveAttribute("data-count", "3");
    await expect(page.locator(".room-portal")).toHaveCount(0);

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
    await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
    await expect(page.locator(".team-board")).toHaveCount(0);
    await expect(page.locator(".library-room")).toHaveCount(0);

    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-count", "3");
    await page.getByRole("button", { name: "Team" }).click();
    await expect(page.locator(".team-board")).toHaveAttribute("data-count", "3");
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-count", "3");

    await page.getByRole("button", { name: "Library" }).click();
    await expect(page.locator(".library-room")).toHaveAttribute("data-ready", "true");
    await expect(page.locator(".library-room")).toHaveAttribute("data-vault", "human");
    await expect(page.locator(".bookcase")).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  });
});

test("grayscale board stays readable", async ({ page }, info) => {
  test.skip(info.project.name !== "tablet-portrait", "one grayscale sheet");
  await page.setViewportSize({ width: 1000, height: 1600 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/team/hale-design-lab");
  await page.getByRole("button", { name: "Team" }).click();
  await page.evaluate(() => {
    document.documentElement.style.filter = "grayscale(1)";
  });
  await expect(page.getByRole("button", { name: /CEO/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Atelier/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Courier/ })).toBeVisible();
  await expect(page.locator(".plaque[data-status='working']")).toContainText("Working");
  await expect(page.locator(".plaque[data-status='idle']")).toContainText("Idle");
  await expect(page.locator(".plaque[data-status='failed']")).toContainText("Failed");
  await keep(page, "team-board-grayscale-tablet-portrait");
});

test("axe has no serious or critical issues on the board, the slip, or the chat", async ({ page }, info) => {
  test.skip(info.project.name !== "tablet-portrait", "one axe pass");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/team/hale-design-lab");
  await page.getByRole("button", { name: "Team" }).click();
  await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
  const board = await new AxeBuilder({ page }).analyze();
  const boardBad = board.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  expect(boardBad, JSON.stringify(boardBad, null, 2)).toEqual([]);

  await page.getByRole("button", { name: "Stapler" }).click();
  await expect(page.getByRole("menu", { name: "Fixture tools" })).toBeVisible();
  const slip = await new AxeBuilder({ page }).analyze();
  const slipBad = slip.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  expect(slipBad, JSON.stringify(slipBad, null, 2)).toEqual([]);

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Courier/ }).click();
  await expect(page.getByRole("heading", { name: "Courier chat" })).toBeVisible();
  const chat = await new AxeBuilder({ page }).analyze();
  const chatBad = chat.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  expect(chatBad, JSON.stringify(chatBad, null, 2)).toEqual([]);
});

test("the school desk is still the learning room", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one preservation pass");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn/reading-room");
  await expect(page.getByRole("heading", { name: "Ponder" })).toBeVisible();
  await expect(page.locator(".desk-top")).toBeVisible();
  await expect(page.locator(".desk-apron")).toBeVisible();
});
