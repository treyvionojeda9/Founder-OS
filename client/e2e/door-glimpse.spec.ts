import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { ENTER_MS, SHUT_MS } from "../src/hall/doorMotion";

const shotDir = "../docs/screenshots/door-glimpse";
const artifactDir = "/opt/cursor/artifacts/screenshots/door-glimpse";
mkdirSync(shotDir, { recursive: true });
mkdirSync(artifactDir, { recursive: true });

const workDoors = [
  ["Open Hale Design Lab", "hale-design-lab", "Hale Design Lab"],
  ["Open Cloud Agent Team", "cloud-agent-team", "Cloud Agent Team"],
  ["Open Local Agent Team", "local-agent-team", "Local Agent Team"],
] as const;

const schoolDoors = [
  ["Open Reading Room", "reading-room", "Reading Room"],
  ["Open Field Notes", "field-notes", "Field Notes"],
] as const;

async function keep(page: Page, name: string, animations: "allow" | "disabled" = "disabled") {
  const path = `${shotDir}/${name}.png`;
  await page.screenshot({ path, animations });
  copyFileSync(path, `${artifactDir}/${name}.png`);
}

async function seek(page: Page, ms: number) {
  await page.evaluate((time) => {
    for (const animation of document.getAnimations()) {
      animation.pause();
      animation.currentTime = time;
    }
  }, ms);
}

async function tabLabels(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("a, button, input, textarea, select, [tabindex]")].flatMap((el) => {
      if (el.closest("[inert], [aria-hidden='true']")) return [];
      if (el.tabIndex < 0) return [];
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return [];
      const name = el.getAttribute("aria-label") || el.textContent?.trim().replace(/\s+/g, " ") || el.tagName;
      return [name];
    }),
  );
}

test.describe("door glimpse", () => {
  test("the swing shows that door's room and Back returns to the same door", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj !== "tablet-portrait" && proj !== "desktop", "tablet portrait and desktop");
    test.setTimeout(120_000);
    await page.clock.install({ time: new Date("2026-10-29T12:00:00Z") });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/home");
    await expect(page.locator("[data-hall=void]")).toBeVisible();
    await page.clock.pauseAt(new Date("2026-10-29T12:00:03Z"));

    const rendering = await page.locator(".door .sprite").first().evaluate((el) => getComputedStyle(el).imageRendering);
    expect(rendering).toBe("pixelated");
    await keep(page, `hall-idle-${proj}`);

    const before = await tabLabels(page);
    const hale = page.getByRole("button", { name: "Open Hale Design Lab" });
    await hale.hover();
    await expect(hale).not.toBeFocused();
    await expect(hale).toHaveClass(/is-cracked/);
    expect(await tabLabels(page)).toEqual(before);

    await hale.focus();
    await expect(hale).toBeFocused();
    await expect(hale).toHaveClass(/is-cracked/);
    expect(await tabLabels(page)).toEqual(before);

    const crack = hale.locator(".leaf-crack");
    const crackStyle = await crack.evaluate((el) => {
      const style = getComputedStyle(el);
      return { opacity: Number(style.opacity), transition: style.transitionDuration, animation: style.animationName };
    });
    expect(crackStyle.opacity).toBe(1);
    expect(crackStyle.transition).toBe("0s");
    expect(crackStyle.animation).toBe("none");
    const closed = await hale.locator(".leaf-pose.is-0").evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(closed).toBe(0);

    const glimpse = hale.locator(".door-glimpse");
    await expect(glimpse).toHaveAttribute("data-destination", "/team/hale-design-lab");
    await expect(glimpse).toHaveAttribute("data-glimpse", "hale-design-lab");
    await expect(glimpse.locator(".study")).toHaveAttribute("data-room", "team");
    await expect(glimpse.locator(".study-team")).toHaveText("Hale Design Lab");
    await expect(glimpse.locator(".desk-top")).toBeVisible();
    const glimpseRender = await glimpse.locator(".sprite").first().evaluate((el) => getComputedStyle(el).imageRendering);
    expect(glimpseRender).toBe("pixelated");
    const step = await hale.evaluate((el) => Number(getComputedStyle(el).getPropertyValue("--glimpse-n")));
    expect(Number.isInteger(step)).toBe(true);
    expect(step).toBeGreaterThan(1);
    const fitted = await glimpse.locator(".glimpse-room").evaluate((el) => {
      const value = getComputedStyle(el).transform;
      const match = value.match(/matrix\(([^)]+)\)/);
      return match ? Number(match[1].split(",")[0]) : 0;
    });
    expect(fitted).toBeCloseTo(1 / step, 2);
    await keep(page, `door-crack-${proj}`);

    for (const [label, id, name] of workDoors) {
      const door = page.getByRole("button", { name: label });
      await door.focus();
      const slot = door.locator(".door-glimpse");
      await expect(slot).toHaveAttribute("data-destination", `/team/${id}`);
      await expect(slot).toHaveAttribute("data-glimpse", id);
      await expect(slot.locator(".study")).toHaveAttribute("data-room", "team");
      await expect(slot.locator(".study-team")).toHaveText(name);
      await expect(slot.locator(".desk-top")).toBeVisible();
    }
    expect(await tabLabels(page)).toEqual(before);

    await hale.evaluate((el) => {
      el.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "pen" }));
    });
    await expect(hale).toHaveClass(/is-cracked/);
    await expect(hale.locator(".door-glimpse")).toHaveAttribute("data-destination", "/team/hale-design-lab");

    await hale.click();
    await expect(hale).toHaveAttribute("data-phase", "swing");
    await expect(page).toHaveURL(/\/home$/);
    await seek(page, 120);
    const openGap = page.locator(".door.is-opening .door-glimpse");
    await expect(openGap).toHaveAttribute("data-destination", "/team/hale-design-lab");
    await expect(openGap.locator(".study-team")).toHaveText("Hale Design Lab");
    await expect(openGap.locator(".desk-top")).toBeVisible();
    const gapOpacity = await openGap.evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(gapOpacity).toBe(1);
    const parked = await page.locator(".room-portal").evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(parked).toBe(0);
    const spill = await page.locator(".door.is-opening .spill").evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(spill).toBeGreaterThan(0.5);
    await keep(page, `mid-swing-work-${proj}`, "allow");

    await seek(page, 200);
    const portal = page.locator(".room-portal");
    const grown = await portal.evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(grown).toBe(1);
    await expect(portal.locator(".study-team")).toHaveText("Hale Design Lab");
    await expect(portal.locator(".study")).toHaveAttribute("data-room", "team");
    const handed = await page.locator(".door.is-opening .door-glimpse").evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(handed).toBe(0);

    await page.clock.runFor(ENTER_MS + 200);
    await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
    await expect(page.locator(".room-portal")).toHaveCount(0);
    await expect(page.locator(".door-glimpse")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
    await keep(page, `room-landing-${proj}`);

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.locator(".room-portal.is-shut")).toBeVisible();
    await seek(page, Math.round(SHUT_MS * 0.3));
    const receding = page.locator(".room-portal.is-shut");
    const recedeOpacity = await receding.evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(recedeOpacity).toBe(1);
    await expect(receding.locator(".study-team")).toHaveText("Hale Design Lab");
    await expect(page.locator(".ghost-lintel")).toBeVisible();
    await keep(page, `back-mid-recede-${proj}`, "allow");

    await page.clock.runFor(SHUT_MS + 200);
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.locator(".room-portal")).toHaveCount(0);
    await expect(hale).toBeFocused();
    await expect(hale).toHaveClass(/is-cracked/);

    await page.getByRole("tab", { name: "School" }).click();
    for (const [label, id, name] of schoolDoors) {
      const door = page.getByRole("button", { name: label });
      await door.focus();
      const slot = door.locator(".door-glimpse");
      await expect(slot).toHaveAttribute("data-destination", `/learn/${id}`);
      await expect(slot).toHaveAttribute("data-glimpse", id);
      await expect(slot.locator(".study")).toHaveAttribute("data-room", "learn");
      await expect(slot.locator(".study-team")).toHaveText(name);
      await expect(slot.locator(".desk-top")).toBeVisible();
    }

    const reading = page.getByRole("button", { name: "Open Reading Room" });
    await reading.click();
    await expect(reading).toHaveAttribute("data-phase", "swing");
    await expect(page).toHaveURL(/\/home$/);
    await seek(page, 120);
    const schoolGap = page.locator(".door.is-opening .door-glimpse");
    await expect(schoolGap).toHaveAttribute("data-destination", "/learn/reading-room");
    await expect(schoolGap.locator(".study")).toHaveAttribute("data-room", "learn");
    await expect(schoolGap.locator(".study-team")).toHaveText("Reading Room");
    await expect(schoolGap.locator(".desk-top")).toBeVisible();
    await keep(page, `mid-swing-school-${proj}`, "allow");

    await page.clock.runFor(ENTER_MS + 200);
    await expect(page).toHaveURL(/\/learn\/reading-room$/);
    await expect(page.getByRole("heading", { name: "Ponder" })).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await page.clock.runFor(SHUT_MS + 200);
    await expect(page).toHaveURL(/\/home$/);
    await expect(reading).toBeFocused();
  });

  test("reduced motion swaps once and never cracks or glimpses", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj !== "tablet-portrait" && proj !== "desktop", "tablet portrait and desktop");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/home");
    const door = page.getByRole("button", { name: "Open Hale Design Lab" });
    const before = await tabLabels(page);
    await door.hover();
    await door.focus();
    await expect(door).toBeFocused();
    await expect(door).not.toHaveClass(/is-cracked/);
    await expect(page.locator(".door-glimpse")).toHaveCount(0);
    const crack = await door.locator(".leaf-crack").evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(crack).toBe(0);
    expect(await tabLabels(page)).toEqual(before);

    await door.evaluate((el) => {
      el.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "pen" }));
    });
    await expect(door).not.toHaveClass(/is-cracked/);
    await expect(page.locator(".door-glimpse")).toHaveCount(0);

    await page.evaluate(() => {
      const record = { swung: false };
      (window as unknown as { __door?: { swung: boolean } }).__door = record;
      const target = document.querySelector("[data-door-id='hale-design-lab']");
      if (!target) return;
      new MutationObserver(() => {
        const phase = target.getAttribute("data-phase");
        if (phase === "swing" || phase === "dolly") record.swung = true;
      }).observe(target, { attributes: true, attributeFilter: ["data-phase"] });
    });
    await door.click();
    await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
    await expect(page.locator(".room-portal")).toHaveCount(0);
    await expect(page.locator(".door-glimpse")).toHaveCount(0);
    await expect(page.locator(".door.is-opening")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
    const swung = await page.evaluate(() => (window as unknown as { __door?: { swung: boolean } }).__door?.swung ?? false);
    expect(swung).toBe(false);

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.locator(".room-portal")).toHaveCount(0);
    await expect(page.locator(".door-glimpse")).toHaveCount(0);
    await expect(door).toBeFocused();
    await expect(door).toHaveAttribute("data-phase", "closed");
    await expect(door).not.toHaveClass(/is-cracked/);

    await page.getByRole("tab", { name: "School" }).click();
    const school = page.getByRole("button", { name: "Open Reading Room" });
    await school.hover();
    await school.focus();
    await expect(page.locator(".door-glimpse")).toHaveCount(0);
    await expect(school).not.toHaveClass(/is-cracked/);
    await school.click();
    await expect(page).toHaveURL(/\/learn\/reading-room$/);
    await expect(page.locator(".door-glimpse")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Ponder" })).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(school).toBeFocused();
    await expect(page.locator(".door-glimpse")).toHaveCount(0);
  });

  test("grayscale mid-swing still shows the room in the opening", async ({ page }, info) => {
    const proj = info.project.name;
    test.skip(proj !== "tablet-portrait" && proj !== "desktop", "tablet portrait and desktop");
    test.setTimeout(90_000);
    await page.clock.install({ time: new Date("2026-10-29T12:00:00Z") });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/home");
    await page.clock.pauseAt(new Date("2026-10-29T12:00:03Z"));
    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    const door = page.getByRole("button", { name: "Open Hale Design Lab" });
    await door.click();
    await expect(door).toHaveAttribute("data-phase", "swing");
    await seek(page, 120);
    const gap = page.locator(".door.is-opening .door-glimpse");
    await expect(gap).toHaveAttribute("data-destination", "/team/hale-design-lab");
    const tones = await gap.evaluate((el) => {
      const paper = el.querySelector(".paper");
      const night = getComputedStyle(el.querySelector(".study") ?? el).backgroundColor;
      const sheet = paper ? getComputedStyle(paper).backgroundColor : "";
      return { night, sheet };
    });
    expect(tones.night).not.toBe(tones.sheet);
    await keep(page, `mid-swing-grayscale-${proj}`, "allow");
  });
});
