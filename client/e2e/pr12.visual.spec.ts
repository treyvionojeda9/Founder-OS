import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const pr12 = "../docs/screenshots/pr12-paper-door";
mkdirSync(pr12, { recursive: true });
mkdirSync("/opt/cursor/artifacts/screenshots/pr12-paper-door", { recursive: true });

async function keep(page: Page, name: string, animations: "allow" | "disabled" = "disabled") {
  const path = `${pr12}/${name}.png`;
  await page.screenshot({ path, animations });
  copyFileSync(path, `/opt/cursor/artifacts/screenshots/pr12-paper-door/${name}.png`);
}

async function size(page: Page, project: string) {
  if (project === "tablet-portrait") await page.setViewportSize({ width: 1000, height: 1600 });
  if (project === "tablet-landscape") await page.setViewportSize({ width: 1600, height: 1000 });
}

async function expectFlatSheet(page: Page) {
  const transform = await page.locator(".paper-slot").evaluate((el) => getComputedStyle(el).transform);
  expect(transform.includes("matrix3d")).toBe(false);
  if (transform === "none") return;
  const match = transform.match(/matrix\(([^)]+)\)/);
  expect(match).not.toBeNull();
  const [a, b, c, d] = (match?.[1] ?? "").split(",").map((part) => Number(part));
  expect(Math.abs((a ?? 0) - 1)).toBeLessThan(0.02);
  expect(Math.abs(b ?? 1)).toBeLessThan(0.02);
  expect(Math.abs(c ?? 1)).toBeLessThan(0.02);
  expect(Math.abs((d ?? 0) - 1)).toBeLessThan(0.02);
}

test.describe("paper and door", () => {
  test("lifted paper is a flat sheet with Chicago time", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj === "desktop-video", "visual projects only");
    await size(page, proj);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/team/hale-design-lab");
    const heading = page.getByRole("heading", { name: "CEO chat" });
    if (proj === "tablet-portrait" || proj === "tablet-landscape") await heading.tap();
    else await heading.click();
    const slot = page.locator(".paper-slot");
    await expect(slot).toHaveAttribute("data-pose", "lifted");
    await expectFlatSheet(page);
    await expect(page.locator(".paper-slot[data-pose='lifted'] .paper-wash")).toBeHidden();
    const times = page.locator(".machine-line time");
    await expect(times.first()).toHaveText("29 Oct 2026, 03:10");
    await expect(times.nth(1)).toHaveText("29 Oct 2026, 03:14");
    await expect(page.locator(".paper-log")).not.toContainText("UTC");
    const font = await page.locator("textarea").evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toContain("press start");
    const shadow = await page.locator(".paper").evaluate((el) => getComputedStyle(el).boxShadow);
    expect(shadow.replaceAll(" ", "")).toContain("27,26,36");
    const tooth = await page.locator(".paper").evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(tooth).toContain("image/svg");
    const titleClear = await page.locator(".paper-log h1").evaluate((el) => {
      const box = el.getBoundingClientRect();
      const paper = el.closest(".paper")?.getBoundingClientRect();
      if (!paper || box.width < 8 || box.height < 16) return false;
      const hit = document.elementFromPoint(box.left + 12, box.top + box.height / 2);
      const inside = box.left >= paper.left && box.right <= paper.right + 1 && box.bottom <= paper.bottom;
      return inside && (hit === el || el.contains(hit));
    });
    expect(titleClear).toBe(true);
    if (proj === "tablet-portrait" || proj === "desktop") await keep(page, `paper-lifted-${proj}`);

    await page.goto("/learn/reading-room");
    const ponder = page.getByRole("heading", { name: "Ponder" });
    if (proj === "tablet-portrait" || proj === "tablet-landscape") await ponder.tap();
    else await ponder.click();
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "lifted");
    await expectFlatSheet(page);
    const ponderFont = await page.locator("#ponder-note").evaluate((el) => getComputedStyle(el).fontFamily);
    expect(ponderFont.toLowerCase()).toContain("press start");
  });

  test("ajar door spills ember light, then the room lands", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj !== "tablet-portrait" && proj !== "desktop", "tablet and desktop shots");
    test.setTimeout(90_000);
    await size(page, proj);
    await page.clock.install({ time: new Date("2026-10-29T12:00:00Z") });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/home");
    await expect(page.getByRole("button", { name: /Hale Design Lab/ })).toBeVisible();
    await page.clock.pauseAt(new Date("2026-10-29T12:00:03Z"));
    await page.getByRole("button", { name: /Hale Design Lab/ }).click();
    await expect(page.locator(".door.is-opening")).toHaveAttribute("data-phase", "swing");
    await expect(page).toHaveURL(/\/home$/);
    await page.evaluate((time) => {
      for (const animation of document.getAnimations()) {
        animation.pause();
        animation.currentTime = time;
      }
    }, 160);
    const opacity = await page.locator(".door.is-opening .spill").evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(opacity).toBeGreaterThan(0.5);
    const warm = await page.locator(".door.is-opening .spill canvas").evaluate((canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return 0;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if ((data[i + 3] ?? 0) < 200) continue;
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        const flame = r === 242 && g === 193 && b === 78;
        const ember = r === 210 && g === 140 && b === 64;
        if (flame || ember) count += 1;
      }
      return count;
    });
    expect(warm).toBeGreaterThan(10);
    await keep(page, `door-ajar-${proj}`, "allow");

    await page.clock.runFor(1200);
    await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
    await expect(page.locator(".room-portal")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "desk");
    await keep(page, `room-landed-${proj}`);
  });

  test("reduced motion opens the door in one frame", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one cut");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/home");
    await page.getByRole("button", { name: /Hale Design Lab/ }).click();
    await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
    await expect(page.locator(".room-portal")).toHaveCount(0);
    await expect(page.locator(".door.is-opening")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
    await expect(page.locator(".machine-line time").first()).toHaveText("29 Oct 2026, 03:10");
  });
});
