import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

mkdirSync("../docs/screenshots/pr1", { recursive: true });

const shot = (name: string) => `../docs/screenshots/pr1/${name}.png`;

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
  await page.screenshot({ path: shot(`home-work-${proj}`) });

  if (proj === "tablet-portrait") {
    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
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
