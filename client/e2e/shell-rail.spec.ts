import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const shotDir = "../docs/shots/shell-rail";
const artifactDir = "/opt/cursor/artifacts/screenshots/shell-rail";
mkdirSync(shotDir, { recursive: true });
mkdirSync(artifactDir, { recursive: true });

async function keep(page: Page, name: string) {
  const path = `${shotDir}/${name}.png`;
  await page.screenshot({ path, animations: "disabled" });
  copyFileSync(path, `${artifactDir}/${name}.png`);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("splash stays full bleed and home opens the shell", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Spark of Freedom" })).toBeVisible();
  await expect(page.locator("[data-shell-frame]")).toHaveCount(0);

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.locator("[data-shell-frame]")).toBeVisible();
  await expect(page.locator(".agent-rail")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Hale Design Lab" })).toBeVisible();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-motion", "snap");

  if (info.project.name === "desktop") {
    await expect(page.locator(".app-shell")).toHaveAttribute("data-dock-mode", "column");
    await expect(page.getByText("Pick an agent to read the chat here.")).toBeVisible();
    await keep(page, "desktop-three-column");
  }
  if (info.project.name === "tablet-portrait") {
    await expect(page.locator(".app-shell")).toHaveAttribute("data-dock-mode", "overlay");
    await expect(page.locator(".chat-dock")).toHaveCount(0);
    await keep(page, "tablet");
  }
  if (info.project.name === "tablet-landscape") {
    await expect(page.locator(".app-shell")).toHaveAttribute("data-dock-mode", "overlay");
    await expect(page.locator(".chat-dock")).toHaveCount(0);
  }
});

test("design and status demos stay unframed", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "once");
  await page.goto("/design");
  await expect(page.getByRole("heading", { name: "Design system" })).toBeVisible();
  await expect(page.locator("[data-shell-frame]")).toHaveCount(0);
  await page.goto("/status-frame");
  await expect(page.locator("[data-shell-frame]")).toHaveCount(0);
});

test("selecting an agent opens that chat in the dock", async ({ page }, info) => {
  await page.goto("/work/overview");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  const rail = page.locator(".agent-rail");
  await rail.getByRole("button", { name: /CEO/ }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(rail.getByRole("button", { name: /Atelier/ })).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/work\/overview\?desk=atelier$/);
  const dock = page.locator(".chat-dock");
  await expect(dock).toBeVisible();
  await expect(dock).toContainText("The desk is quiet.");
  await expect(dock.getByRole("textbox", { name: "Write to Atelier" })).toBeVisible();
  await expect(dock.getByText("Nothing is sent.")).toBeVisible();
  await expect(dock.getByRole("button", { name: "Publish the forge note" })).toHaveCount(0);

  const duration = await dock.evaluate((el) => getComputedStyle(el).animationDuration);
  expect(duration === "0s").toBe(true);

  if (info.project.name === "desktop") {
    await keep(page, "agent-selected");
    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    await expect(rail.locator(".status-frame[data-pattern='solid']").first()).toBeVisible();
    await expect(rail.locator(".status-frame[data-pattern='dash']").first()).toBeVisible();
    await expect(rail.locator(".status-frame[data-pattern='double']").first()).toBeVisible();
    await expect(rail.locator(".status-frame[data-pattern='crack']").first()).toBeVisible();
    await keep(page, "grayscale");
    await page.evaluate(() => {
      document.documentElement.style.filter = "";
    });
  }

  const mode = await page.locator(".app-shell").getAttribute("data-dock-mode");
  if (mode === "overlay") {
    await page.keyboard.press("Escape");
    await expect(page.locator(".chat-dock")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    return;
  }

  await dock.getByRole("textbox", { name: "Write to Atelier" }).focus();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Pick an agent to read the chat here.")).toBeVisible();
});
