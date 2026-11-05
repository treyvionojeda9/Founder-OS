import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const pr7 = "../docs/screenshots/pr7";
mkdirSync(pr7, { recursive: true });
mkdirSync("/opt/cursor/artifacts/screenshots/pr7", { recursive: true });

async function keep(page: Page, name: string) {
  const path = `${pr7}/${name}.png`;
  await page.screenshot({ path, animations: "disabled" });
  copyFileSync(path, `/opt/cursor/artifacts/screenshots/pr7/${name}.png`);
}

async function land(page: Page, project: string) {
  if (project === "tablet-portrait") await page.setViewportSize({ width: 1000, height: 1600 });
  if (project === "tablet-landscape") await page.setViewportSize({ width: 1600, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/team/hale-design-lab");
  await page.getByRole("button", { name: "Library" }).click();
  await expect(page.locator(".library-room")).toHaveAttribute("data-ready", "true");
  await expect(page.locator(".library-room")).toHaveAttribute("data-vault", "human");
}

test.describe("work library shelf", () => {
  test("shows an empty shelf, saves human notes, and Back stays in the team room", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj === "desktop-video", "visual projects only");
    await land(page, proj);
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
    await expect(page.getByText("The shelf is bare.")).toBeVisible();
    await expect(page.getByText("Human notes for this team.")).toBeVisible();
    await expect(page.getByRole("img", { name: "Desk lamp, lit" })).toBeVisible();
    await expect(page.locator(".bookcase")).toBeVisible();
    await expect(page.locator(".shelf-bay")).toHaveCount(3);
    const place = page.getByRole("button", { name: "Place a sheet" });
    const placeBox = await place.boundingBox();
    expect(placeBox && placeBox.width >= 48 && placeBox.height >= 48).toBe(true);
    await keep(page, `library-empty-${proj}`);

    await place.click();
    await expect(page.locator(".library-paper")).toHaveAttribute("data-pose", "lifted");
    await expect(page.locator(".library-paper")).toHaveAttribute("data-still", "true");
    expect(await page.locator(".library-paper").evaluate((el) => el.getAnimations().length)).toBe(0);
    await page.getByRole("button", { name: "Save this note" }).click();
    await expect(page.getByText("Write a line before you save it.")).toBeVisible();
    await page.getByRole("textbox", { name: "Your note" }).fill("Lamp hours on the forge.");
    await page.getByRole("button", { name: "Save this note" }).click();
    await expect(page.getByText("Saved on the shelf.")).toBeVisible();
    if (proj === "tablet-portrait") await keep(page, "library-paper-tablet-portrait");
    if (proj === "tablet-landscape") await keep(page, "library-paper-tablet-landscape");
    if (proj === "desktop") await keep(page, "library-paper-desktop");

    await page.getByRole("button", { name: "Set it down" }).click();
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
    await page.getByRole("button", { name: "Place a sheet" }).click();
    await page.getByRole("textbox", { name: "Your note" }).fill("A margin I kept.");
    await page.getByRole("button", { name: "Save this note" }).click();
    await expect(page.getByText("Saved on the shelf.")).toBeVisible();
    await page.getByRole("button", { name: "Set it down" }).click();
    await expect(page.getByRole("button", { name: "A margin I kept." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Lamp hours on the forge." })).toBeVisible();
    await expect(page.getByText("The shelf is bare.")).toHaveCount(0);
    const bands = await page.locator(".spine").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-band")));
    expect(new Set(bands).size).toBeGreaterThan(1);
    await keep(page, `library-shelf-${proj}`);

    await page.getByRole("button", { name: "Lamp hours on the forge." }).click();
    const note = page.getByRole("textbox", { name: "Your note" });
    await expect(note).toHaveValue("Lamp hours on the forge.");
    await note.fill("Lamp hours, revised by hand.");
    await page.getByRole("button", { name: "Save this note" }).click();
    await expect(page.getByText("Saved on the shelf.")).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
    await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
    await expect(page.locator(".library-room")).toHaveCount(0);
    await expect(page.locator(".room-portal")).toHaveCount(0);

    await page.getByRole("tab", { name: "Overview" }).click();
    await page.getByRole("button", { name: "Library" }).click();
    await expect(page.locator(".library-room")).toHaveAttribute("data-ready", "true");
    await expect(page.getByRole("button", { name: "Lamp hours, revised by hand." })).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.locator(".desk-grid")).toHaveAttribute("data-count", "3");
  });
});

test("grayscale shelf stays readable", async ({ page }, info) => {
  test.skip(info.project.name !== "tablet-portrait", "one grayscale sheet");
  await page.setViewportSize({ width: 1000, height: 1600 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/team/hale-design-lab");
  await page.getByRole("button", { name: "Library" }).click();
  await page.getByRole("button", { name: "Place a sheet" }).click();
  await page.getByRole("textbox", { name: "Your note" }).fill("A dark spine.");
  await page.getByRole("button", { name: "Save this note" }).click();
  await page.getByRole("button", { name: "Set it down" }).click();
  await page.getByRole("button", { name: "Place a sheet" }).click();
  await page.getByRole("textbox", { name: "Your note" }).fill("A pale spine.");
  await page.getByRole("button", { name: "Save this note" }).click();
  await page.getByRole("button", { name: "Set it down" }).click();
  await page.evaluate(() => {
    document.documentElement.style.filter = "grayscale(1)";
  });
  await expect(page.getByRole("button", { name: "A dark spine." })).toBeVisible();
  await expect(page.getByRole("button", { name: "A pale spine." })).toBeVisible();
  await keep(page, "library-grayscale-tablet-portrait");
});

test("axe has no serious or critical issues on the shelf or the open note", async ({ page }, info) => {
  test.skip(info.project.name !== "tablet-portrait", "one axe pass");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/team/hale-design-lab");
  await page.getByRole("button", { name: "Library" }).click();
  await expect(page.getByText("The shelf is bare.")).toBeVisible();
  const empty = await new AxeBuilder({ page }).analyze();
  const emptyBad = empty.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  expect(emptyBad, JSON.stringify(emptyBad, null, 2)).toEqual([]);
  await page.getByRole("button", { name: "Place a sheet" }).click();
  await expect(page.getByRole("button", { name: "Set it down" })).toBeVisible();
  const paper = await new AxeBuilder({ page }).analyze();
  const paperBad = paper.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  expect(paperBad, JSON.stringify(paperBad, null, 2)).toEqual([]);
});
