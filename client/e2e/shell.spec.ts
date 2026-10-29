import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

mkdirSync("/tmp/founder-os-e2e", { recursive: true });

const shot = (name: string) => `/tmp/founder-os-e2e/${name}.png`;

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("splash, work hall, school hall, and a work door", async ({ page }, info) => {
  const proj = info.project.name;
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Spark of Freedom" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Spark of Freedom flame" })).toBeVisible();
  await page.screenshot({ path: shot(`splash-${proj}`) });

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("tab", { name: "Work" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: /Hale Design Lab/ })).toBeVisible();
  const hall = page.locator("[data-hall=void]");
  await expect(hall).toBeVisible();
  await expect(hall).toHaveCSS("background-color", "rgb(27, 26, 36)");
  const door = page.getByRole("button", { name: /Hale Design Lab/ });
  await expect(door).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(page.locator(".contact-shadow").first()).toBeVisible();
  await expect(page.locator(".door-grid")).toHaveAttribute("data-count", "3");
  await expect(page.locator(".door-wrap")).toHaveCSS("perspective", /px/);
  const rig = page.locator(".door-rig").first();
  await expect(rig).toHaveCSS("transform-style", "preserve-3d");
  const yaws = await page.locator(".door-slot").evaluateAll((nodes) =>
    nodes.map((node) => Number(node.getAttribute("data-yaw"))),
  );
  expect(yaws[0]).toBeGreaterThan(0);
  expect(yaws[1]).toBe(0);
  expect(yaws[2]).toBeLessThan(0);
  await page.screenshot({ path: shot(`home-work-${proj}`) });

  if (proj === "tablet-portrait") {
    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    await expect(page.getByRole("button", { name: /Hale Design Lab/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Work" })).toBeVisible();
    await expect(page.locator(".contact-shadow").first()).toBeVisible();
    await page.screenshot({ path: shot("home-work-tablet-portrait-grayscale") });
    await page.evaluate(() => {
      document.documentElement.style.filter = "";
    });
  }

  await page.getByRole("tab", { name: "School" }).click();
  await expect(page.getByRole("button", { name: /Reading Room/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Hale Design Lab/ })).toHaveCount(0);
  await page.screenshot({ path: shot(`home-school-${proj}`) });

  await page.getByRole("tab", { name: "Work" }).click();
  await page.getByRole("button", { name: /Hale Design Lab/ }).click();
  await expect(page.getByRole("heading", { name: "CEO chat — PR #2" })).toBeVisible();
  await page.getByRole("link", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/home$/);
});

test("door opens, then the route changes", async ({ page }, info) => {
  const proj = info.project.name;
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/home");
  await page.getByRole("button", { name: /Hale Design Lab/ }).click();
  const opening = page.getByRole("button", { name: /Hale Design Lab/ });
  await expect(opening).toHaveAttribute("data-phase", "swing");
  await expect(page).toHaveURL(/\/home$/);
  await page.screenshot({ path: shot(`door-open-swing-${proj}`) });
  await expect(opening).toHaveAttribute("data-phase", "dolly");
  await expect(page).toHaveURL(/\/home$/);
  await page.screenshot({ path: shot(`door-open-dolly-${proj}`) });
  await expect(page).toHaveURL(/\/team\/hale-design-lab$/, { timeout: 4000 });
  await expect(page.getByRole("heading", { name: "CEO chat — PR #2" })).toBeVisible();
});

test("enter and space on a focused door run the open sequence", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "keyboard once");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/home");
  await page.locator(".stage-settings, .rail .text-link").first().focus();
  await page.keyboard.press("Tab");
  const door = page.getByRole("button", { name: /Hale Design Lab/ });
  await expect(door).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(door).toHaveAttribute("data-phase", "swing");
  await expect(page).toHaveURL(/\/home$/);
  await expect(page).toHaveURL(/\/team\/hale-design-lab$/, { timeout: 4000 });

  await page.goto("/home");
  await page.getByRole("button", { name: /Cloud Agent Team/ }).focus();
  await page.keyboard.press("Space");
  const cloud = page.getByRole("button", { name: /Cloud Agent Team/ });
  await expect(cloud).toHaveAttribute("data-phase", "swing");
  await expect(page).toHaveURL(/\/home$/);
  await expect(page).toHaveURL(/\/team\/cloud-agent-team$/, { timeout: 4000 });
});

test("a tap runs the open sequence", async ({ page }, info) => {
  test.skip(info.project.name !== "tablet-portrait", "pen-sized touch");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/home");
  const door = page.getByRole("button", { name: /Hale Design Lab/ });
  await door.tap();
  await expect(door).toHaveAttribute("data-phase", "swing");
  await expect(page).toHaveURL(/\/home$/);
  await expect(page).toHaveURL(/\/team\/hale-design-lab$/, { timeout: 4000 });
});

test("a school door opens the learning stub", async ({ page }) => {
  await page.goto("/home");
  await page.getByRole("tab", { name: "School" }).click();
  await page.getByRole("button", { name: /Reading Room/ }).click();
  await expect(page.getByRole("heading", { name: "Learning desk — PR #4" })).toBeVisible();
});

test("offline indicator appears and home still renders", async ({ page }, info) => {
  await page.goto("/home");
  await expect(page.getByRole("button", { name: /Hale Design Lab/ })).toBeVisible();
  await page.context().setOffline(true);
  await expect(page.getByText("Offline — saving locally")).toBeVisible();
  await expect(page.getByRole("button", { name: /Cloud Agent Team/ })).toBeVisible();
  await page.screenshot({ path: shot(`home-offline-${info.project.name}`) });
});

test("design system page", async ({ page }, info) => {
  await page.goto("/design");
  await expect(page.getByRole("heading", { name: "Design system" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Founder Ember" })).toBeVisible();
  await page.screenshot({ path: shot(`design-system-${info.project.name}`), fullPage: true });
});

test("axe has no serious or critical issues on the shell routes", async ({ page }) => {
  for (const path of ["/", "/home", "/design", "/settings"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
    expect(bad, `${path}\n${JSON.stringify(bad, null, 2)}`).toEqual([]);
  }
});

test("splash auto-continues when motion is allowed", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "covered once");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page).toHaveURL(/\/home$/, { timeout: 4000 });
});
