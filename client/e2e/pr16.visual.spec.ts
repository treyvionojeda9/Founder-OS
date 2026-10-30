import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const pr16 = "../docs/screenshots/pr16-team-library";
mkdirSync(pr16, { recursive: true });
mkdirSync("/opt/cursor/artifacts/screenshots/pr16-team-library", { recursive: true });

const night = "rgb(27, 26, 36)";
const slate = "rgb(61, 61, 74)";
const paper = "rgb(233, 223, 199)";
const wood = "rgb(143, 86, 59)";
const darkwood = "rgb(79, 53, 46)";
const ember = "rgb(210, 140, 64)";
const plum = "rgb(133, 69, 80)";

async function keep(page: Page, name: string) {
  const path = `${pr16}/${name}.png`;
  await page.screenshot({ path, animations: "disabled" });
  copyFileSync(path, `/opt/cursor/artifacts/screenshots/pr16-team-library/${name}.png`);
}

async function size(page: Page, project: string) {
  if (project === "tablet-portrait") await page.setViewportSize({ width: 1000, height: 1600 });
  if (project === "tablet-landscape") await page.setViewportSize({ width: 1600, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
}

async function tileColors(page: Page, selector: string) {
  return page.locator(selector).first().evaluate(async (el) => {
    const style = getComputedStyle(el);
    const image = style.backgroundImage;
    const matched = image.match(/base64,([^"')]+)/);
    if (!matched) return { image, colors: [] as string[] };
    const response = await fetch(`data:image/png;base64,${matched[1]}`);
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { image, colors: [] as string[] };
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bitmap, 0, 0);
    const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
    const colors = new Set<string>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    }
    return { image, colors: [...colors] };
  });
}

async function strayPaint(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => {
    const ok = new Set([
      "rgb(27, 26, 36)",
      "rgb(61, 61, 74)",
      "rgb(233, 223, 199)",
      "rgb(143, 86, 59)",
      "rgb(79, 53, 46)",
      "rgb(210, 140, 64)",
      "rgb(242, 193, 78)",
      "rgb(133, 69, 80)",
      "rgba(0, 0, 0, 0)",
      "transparent",
    ]);
    const bad: string[] = [];
    const nodes = [root, ...root.querySelectorAll("*")];
    const sides = ["top", "right", "bottom", "left"] as const;
    for (const node of nodes) {
      if (!(node instanceof Element)) continue;
      const style = getComputedStyle(node);
      const name = node.className?.toString() || node.tagName;
      const bg = style.backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && !ok.has(bg)) bad.push(`${name} background ${bg}`);
      const fg = style.color;
      if (fg && !ok.has(fg)) bad.push(`${name} color ${fg}`);
      for (const side of sides) {
        const width = style.getPropertyValue(`border-${side}-width`);
        const borderStyle = style.getPropertyValue(`border-${side}-style`);
        if (borderStyle === "none" || width === "0px") continue;
        const color = style.getPropertyValue(`border-${side}-color`);
        if (color && !ok.has(color)) bad.push(`${name} border-${side} ${color}`);
      }
      const shadow = style.boxShadow;
      if (!shadow || shadow === "none") continue;
      const found = shadow.match(/rgba?\([^)]+\)/g) ?? [];
      for (const color of found) {
        if (!ok.has(color)) bad.push(`${name} shadow ${color}`);
      }
    }
    return bad;
  });
}

test.describe("team plaques and library spines", () => {
  test("engraved plaques hang on the wall", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj !== "tablet-portrait" && proj !== "desktop", "tablet and desktop shots");
    await size(page, proj);
    await page.goto("/team/hale-design-lab");
    await page.getByRole("button", { name: "Team" }).click();
    await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
    await expect(page.locator(".team-board")).toHaveAttribute("data-mount", "wall");
    await expect(page.locator(".team-board")).toHaveAttribute("data-count", "3");
    await expect(page.locator(".board-wall")).toHaveAttribute("data-material", "plaster");
    await expect(page.locator(".board-void")).toHaveCSS("perspective", /px/);
    await expect(page.locator(".board-hanger")).toHaveCSS("transform", /matrix/);

    const wall = await page.locator(".team-board").boundingBox();
    const face = await page.locator(".board-face").boundingBox();
    if (!wall || !face) throw new Error("board missing");
    expect(face.y).toBeGreaterThan(wall.y + 8);
    expect(face.y + face.height).toBeLessThan(wall.y + wall.height - 8);
    expect(face.x).toBeGreaterThan(wall.x);
    expect(wall.height).toBeGreaterThan(face.height);

    for (const status of ["working", "idle", "failed"] as const) {
      const plaque = page.locator(`.plaque[data-status='${status}']`);
      await expect(plaque).toHaveAttribute("data-plaque", "engraved");
      await expect(plaque.locator("input, textarea, select")).toHaveCount(0);
      const plate = plaque.locator(".plaque-plate");
      await expect(plate).toHaveCSS("background-color", darkwood);
      const plateImage = await plate.evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(plateImage).toBe("none");
      await expect(plate).not.toHaveCSS("background-color", paper);
      const nameFamily = await plaque.locator(".plaque-name").evaluate((el) => getComputedStyle(el).fontFamily);
      expect(nameFamily.toLowerCase()).toContain("press start");
    }

    await expect(page.locator(".plaque[data-status='working'] .status-chip")).toHaveCSS("background-color", ember);
    await expect(page.locator(".plaque[data-status='working'] .status-chip")).toHaveCSS("color", night);
    await expect(page.locator(".plaque[data-status='idle'] .status-chip")).toHaveCSS("background-color", slate);
    await expect(page.locator(".plaque[data-status='idle'] .status-chip")).toHaveCSS("color", paper);
    await expect(page.locator(".plaque[data-status='failed'] .status-chip")).toHaveCSS("background-color", plum);
    await expect(page.locator(".plaque[data-status='failed'] .status-chip")).toHaveCSS("color", paper);
    await expect(page.locator(".stapler")).toHaveAttribute("data-reach", "local");
    await expect(page.getByRole("button", { name: "Stapler" })).toBeVisible();

    const paint = await strayPaint(page, ".team-board");
    expect(paint, paint.join("\n")).toEqual([]);

    await keep(page, `team-${proj}`);
  });

  test("the shelf header sits in the case, and spines stay upright", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj !== "tablet-portrait" && proj !== "desktop", "tablet and desktop shots");
    test.setTimeout(90_000);
    await size(page, proj);
    await page.goto("/team/hale-design-lab");
    await page.getByRole("button", { name: "Library" }).click();
    await expect(page.locator(".library-room")).toHaveAttribute("data-ready", "true");
    await expect(page.locator(".library-room")).toHaveAttribute("data-vault", "human");
    await expect(page.getByText("The shelf is bare.")).toBeVisible();
    await expect(page.locator(".shelf-next")).toHaveText("Place a sheet.");
    await expect(page.getByRole("button", { name: "Place a sheet" })).toBeVisible();

    const book = await page.locator(".bookcase").boundingBox();
    const head = await page.locator(".library-head").boundingBox();
    if (!book || !head) throw new Error("case missing");
    expect(head.x).toBeGreaterThanOrEqual(book.x - 1);
    expect(head.y).toBeGreaterThanOrEqual(book.y - 1);
    expect(head.x + head.width).toBeLessThanOrEqual(book.x + book.width + 1);
    expect(head.y + head.height).toBeLessThanOrEqual(book.y + book.height + 1);
    await expect(page.locator(".bookcase")).toHaveCSS("border-right-color", darkwood);
    const caseShadow = await page.locator(".bookcase").evaluate((el) => getComputedStyle(el).boxShadow);
    expect(caseShadow).not.toContain("255, 0, 0");
    expect(caseShadow).not.toContain("133, 69, 80");

    const back = await tileColors(page, ".shelf-bays");
    expect(back.image).toContain("data:image/png");
    expect(back.image).not.toContain("gradient");
    expect(back.colors).toContain("143,86,59");
    expect(back.colors).not.toContain("133,69,80");
    const emptyPaint = await strayPaint(page, ".library-room");
    expect(emptyPaint, emptyPaint.join("\n")).toEqual([]);
    await keep(page, `library-empty-${proj}`);

    await page.getByRole("button", { name: "Place a sheet" }).click();
    await page.getByRole("textbox", { name: "Your note" }).fill("A margin I kept.");
    await page.getByRole("button", { name: "Save this note" }).click();
    await expect(page.getByText("Saved on the shelf.")).toBeVisible();
    await page.getByRole("button", { name: "Set it down" }).click();
    await page.getByRole("button", { name: "Place a sheet" }).click();
    await page.getByRole("textbox", { name: "Your note" }).fill("Lamp hours on the forge.");
    await page.getByRole("button", { name: "Save this note" }).click();
    await page.getByRole("button", { name: "Set it down" }).click();
    await page.getByRole("button", { name: "Place a sheet" }).click();
    await page.getByRole("textbox", { name: "Your note" }).fill("Camp log.");
    await page.getByRole("button", { name: "Save this note" }).click();
    await page.getByRole("button", { name: "Set it down" }).click();

    await expect(page.getByRole("button", { name: "Camp log." })).toBeVisible();
    await expect(page.getByText("The shelf is bare.")).toHaveCount(0);
    const spines = page.locator(".spine");
    await expect(spines).toHaveCount(3);
    const tones = await spines.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-tone")));
    expect(new Set(tones).size).toBeGreaterThan(1);
    const title = page.locator(".spine-title").first();
    await expect(title).toHaveAttribute("data-label", "pixel");
    const mode = await title.evaluate((el) => getComputedStyle(el).writingMode);
    const family = await title.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(mode).toBe("horizontal-tb");
    expect(family.toLowerCase()).toContain("press start");
    const line = title.locator(".spine-line").first();
    const lineBox = await line.boundingBox();
    expect(lineBox && lineBox.height >= 8 && lineBox.height <= 24).toBe(true);
    expect(lineBox && lineBox.width >= 16).toBe(true);
    const clipped = await page.locator(".spine-line").evaluateAll((nodes) =>
      nodes.map((node) => ({
        text: node.textContent,
        overflow: node.scrollWidth - node.clientWidth,
      })),
    );
    for (const row of clipped) expect(row.overflow, row.text ?? "").toBeLessThanOrEqual(1);

    const filledPaint = await strayPaint(page, ".library-room");
    expect(filledPaint, filledPaint.join("\n")).toEqual([]);
    await keep(page, `library-${proj}`);
  });

  test("grayscale still names the lamps and the spines", async ({ page }, info) => {
    test.skip(info.project.name !== "tablet-portrait", "one grayscale sheet");
    await size(page, "tablet-portrait");
    await page.goto("/team/hale-design-lab");
    await page.getByRole("button", { name: "Team" }).click();
    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    await expect(page.locator(".plaque[data-status='working'] .status-chip")).toContainText("Working");
    await expect(page.locator(".plaque[data-status='idle'] .status-chip")).toContainText("Idle");
    await expect(page.locator(".plaque[data-status='failed'] .status-chip")).toContainText("Failed");
    await keep(page, "team-grayscale-tablet-portrait");

    await page.evaluate(() => {
      document.documentElement.style.filter = "none";
    });
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
    await expect(page.locator(".spine-title").first()).toHaveCSS("writing-mode", "horizontal-tb");
    await keep(page, "library-grayscale-tablet-portrait");
  });
});
