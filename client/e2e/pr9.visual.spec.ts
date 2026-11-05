import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const pr9 = "../docs/screenshots/pr9-visual-chrome";
mkdirSync(pr9, { recursive: true });
mkdirSync("/opt/cursor/artifacts/screenshots/pr9-visual-chrome", { recursive: true });

const darkwood = "rgb(79, 53, 46)";
const ember = "rgb(210, 140, 64)";
const flame = "rgb(242, 193, 78)";
const plum = "rgb(133, 69, 80)";
const paper = "rgb(233, 223, 199)";
const night = "rgb(27, 26, 36)";

async function keep(page: Page, name: string) {
  const path = `${pr9}/${name}.png`;
  await page.screenshot({ path, animations: "disabled" });
  copyFileSync(path, `/opt/cursor/artifacts/screenshots/pr9-visual-chrome/${name}.png`);
}

async function size(page: Page, project: string) {
  if (project === "tablet-portrait") await page.setViewportSize({ width: 1000, height: 1600 });
  if (project === "tablet-landscape") await page.setViewportSize({ width: 1600, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
}

async function pixelFont(page: Page, selector: string) {
  const family = await page.locator(selector).first().evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family.toLowerCase()).toContain("press start");
  expect(family.toLowerCase()).not.toContain("system-ui");
}

test.describe("pixel chrome and type", () => {
  test("darkwood bar, ember active, and the type scale hold on every work surface", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj === "desktop-video", "visual projects only");
    test.setTimeout(90_000);
    await size(page, proj);
    const shot = proj === "tablet-portrait" || proj === "desktop";

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Spark of Freedom" })).toBeVisible();
    await expect(page.locator(".splash .wordmark")).toHaveCSS("font-size", "32px");
    await pixelFont(page, ".splash .wordmark");
    await pixelFont(page, ".hint");
    if (shot) await keep(page, `splash-${proj}`);

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("button", { name: /Hale Design Lab/ })).toBeVisible();
    await expect(page.locator(".stage-head.pixel-bar")).toHaveCSS("background-color", darkwood);
    await expect(page.locator(".toggle-dock")).toHaveCSS("background-color", darkwood);
    await expect(page.getByRole("tab", { name: "Work" })).toHaveCSS("background-color", ember);
    await expect(page.getByRole("tab", { name: "Work" })).toHaveCSS("color", night);
    await expect(page.getByRole("tab", { name: "School" })).toHaveCSS("background-color", darkwood);
    await pixelFont(page, ".stage-settings, .rail .text-link");
    await pixelFont(page, ".door-name");
    await expect(page.locator(".door-name").first()).toHaveCSS("font-size", "8px");
    if (shot) await keep(page, `hall-${proj}`);
    const school = page.getByRole("tab", { name: "School" });
    await school.hover();
    await expect(school).toHaveCSS("color", flame);
    const schoolBox = await school.boundingBox();
    if (schoolBox) {
      await page.mouse.move(schoolBox.x + schoolBox.width / 2, schoolBox.y + schoolBox.height / 2);
      await page.mouse.down();
      await expect(school).toHaveCSS("background-color", plum);
      await page.mouse.up();
    }

    await page.goto("/team/hale-design-lab");
    await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
    await expect(page.locator(".pixel-bar")).toHaveCSS("background-color", darkwood);
    await expect(page.getByRole("tab", { name: "CEO" })).toHaveCSS("background-color", ember);
    await expect(page.getByRole("tab", { name: "CEO" })).toHaveCSS("color", night);
    await expect(page.getByRole("button", { name: "Library" })).toHaveCSS("background-color", darkwood);
    await expect(page.getByRole("button", { name: "Back" })).toHaveCSS("background-color", darkwood);
    await pixelFont(page, ".pixel-bar button");
    await pixelFont(page, ".study-team");
    await pixelFont(page, ".paper-log p");
    await expect(page.locator(".paper h1")).toHaveCSS("font-size", "16px");
    await expect(page.locator(".machine-line p").first()).toHaveCSS("font-size", "8px");
    await expect(page.locator(".lamp-spot .status-chip")).toHaveCSS("background-color", ember);
    await expect(page.locator(".lamp-spot .status-chip")).toHaveCSS("color", night);
    if (shot) await keep(page, `ceo-${proj}`);

    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Overview" })).toHaveCSS("background-color", ember);
    await expect(page.locator(".overview-title")).toHaveCSS("font-size", "24px");
    await expect(page.locator(".overview-legend")).toHaveCSS("font-size", "16px");
    await pixelFont(page, ".overview-legend");
    await pixelFont(page, ".agent-desk-name");
    await expect(page.locator(".agent-desk[data-status='working'] .status-chip")).toHaveCSS("background-color", ember);
    await expect(page.locator(".agent-desk[data-status='idle'] .status-chip")).toHaveCSS("background-color", "rgb(61, 61, 74)");
    await expect(page.locator(".agent-desk[data-status='failed'] .status-chip")).toHaveCSS("background-color", plum);
    await expect(page.locator(".agent-desk[data-status='failed'] .status-chip")).toHaveCSS("color", paper);
    if (shot) await keep(page, `overview-${proj}`);

    await page.getByRole("button", { name: "Library" }).click();
    await expect(page.locator(".library-room")).toHaveAttribute("data-ready", "true");
    await expect(page.getByRole("button", { name: "Library" })).toHaveCSS("background-color", ember);
    await expect(page.getByRole("button", { name: "Library" })).toHaveCSS("color", night);
    await pixelFont(page, ".library-head p");
    await expect(page.getByRole("heading", { name: "Library" })).toHaveCSS("font-size", "24px");
    if ((await page.locator(".spine-title").count()) > 0) await pixelFont(page, ".spine-title");
    if (shot) await keep(page, `library-${proj}`);

    await page.getByRole("button", { name: "Team" }).click();
    await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Team" })).toHaveCSS("background-color", ember);
    await expect(page.locator(".board-head h1")).toHaveCSS("font-size", "24px");
    await expect(page.locator(".board-legend")).toHaveCSS("font-size", "16px");
    await pixelFont(page, ".plaque-name");
    await pixelFont(page, ".plaque-title");
    const failed = page.locator(".plaque[data-status='failed'] .status-chip");
    await expect(failed).toHaveCSS("background-color", plum);
    await expect(failed).toHaveCSS("color", paper);
    await expect(failed).toContainText("Failed");
    await expect(page.locator(".plaque[data-status='working'] .status-chip")).toHaveCSS("background-color", ember);
    await expect(page.locator(".plaque[data-status='working'] .status-chip")).toHaveCSS("color", night);
    await expect(page.locator(".plaque[data-status='idle'] .status-chip")).toHaveCSS("color", paper);
    if (shot) await keep(page, `team-${proj}`);

    await page.goto("/learn/reading-room");
    await expect(page.getByRole("heading", { name: "Ponder" })).toBeVisible();
    await expect(page.locator(".pixel-bar")).toHaveCSS("background-color", darkwood);
    await expect(page.getByRole("button", { name: "Back" })).toHaveCSS("background-color", darkwood);
    await pixelFont(page, ".study-team");
    await pixelFont(page, ".paper h1");
    await expect(page.locator(".paper h1")).toHaveCSS("font-size", "16px");
    if (shot) await keep(page, `school-${proj}`);
  });
});
