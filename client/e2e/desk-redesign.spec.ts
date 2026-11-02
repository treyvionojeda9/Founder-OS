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
    if (info.project.name === "tablet-portrait") {
      expect(ratio).toBeGreaterThanOrEqual(0.85);
      expect(paper.width).toBeGreaterThan(paper.height);
    } else {
      expect(ratio).toBeGreaterThanOrEqual(0.4);
      expect(ratio).toBeLessThanOrEqual(0.62);
    }
    expect(paper.x).toBeGreaterThanOrEqual(top.x - 1);
    expect(paper.y).toBeGreaterThanOrEqual(top.y - 1);
    expect(paper.x + paper.width).toBeLessThanOrEqual(top.x + top.width + 1);
    expect(paper.y + paper.height).toBeLessThanOrEqual(top.y + top.height + 1);

    const fontSize = await page.locator(".machine-line > p").first().evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(16);
    expect(fontSize).toBeLessThanOrEqual(info.project.name === "tablet-portrait" ? 20 : 24);
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "desk");
    await expect(page.locator("[data-approval='inline']")).toBeVisible();
    await expect(page.locator(".approval-overlay")).toHaveCount(0);
    await expect(page.getByText("Keep it on this sheet.")).toBeVisible();
    await expect(page.getByText("I can publish the forge note to the studio channel.")).toBeVisible();
    await expect(page.getByLabel("Message the CEO")).toBeVisible();
    await expect(page.getByPlaceholder("Message the CEO")).toBeVisible();

    const agent = await boxOf(page, ".ceo-seat");
    expect(agent.y).toBeLessThan(top.y);
    expect(agent.y + agent.height).toBeGreaterThan(top.y);
    expect(agent.height).toBeGreaterThanOrEqual(96);
    const lamp = await boxOf(page, ".lamp-spot");
    const lampOnTop =
      lamp.x + lamp.width > top.x &&
      lamp.x < top.x + top.width &&
      lamp.y + lamp.height > top.y &&
      lamp.y < top.y + top.height;
    expect(lampOnTop).toBe(true);
    const plate = await boxOf(page, ".desk-nameplate");
    expect(plate.y).toBeGreaterThan(top.y);
    expect(plate.x).toBeGreaterThanOrEqual(desk.x - 2);
    expect(plate.x + plate.width).toBeLessThanOrEqual(desk.x + desk.width + 2);

    const collisions = await page.locator(".paper").evaluate((paper) => {
      const clipOf = (node: Element) => {
        let box = node.getBoundingClientRect();
        let current: Element | null = node.parentElement;
        while (current) {
          const style = getComputedStyle(current);
          if (/(auto|scroll|hidden)/.test(style.overflow + style.overflowY)) {
            const view = current.getBoundingClientRect();
            const x = Math.max(box.x, view.x);
            const y = Math.max(box.y, view.y);
            const right = Math.min(box.x + box.width, view.x + view.width);
            const bottom = Math.min(box.y + box.height, view.y + view.height);
            box = { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y), top: y, left: x, right, bottom, toJSON() { return {}; } } as DOMRect;
          }
          if (current === paper) break;
          current = current.parentElement;
        }
        return box;
      };
      const rows = [...paper.querySelectorAll<HTMLElement>("h1, p, button, label, time")].filter((node) => {
        const text = node.innerText.replace(/\s+/g, " ").trim();
        if (!text) return false;
        if ([...node.querySelectorAll("h1, p, button, label, time")].some((child) => child.innerText.trim())) return false;
        return true;
      });
      const boxes = rows.map((node) => {
        const full = node.getBoundingClientRect();
        const seen = clipOf(node);
        return { text: node.innerText.replace(/\s+/g, " ").trim().slice(0, 48), full, seen };
      });
      const visible = boxes.filter((item) => item.seen.width > 1 && item.seen.height > 1);
      const clipped = visible
        .filter((item) => item.seen.height < item.full.height - 1 || item.seen.width < item.full.width - 1)
        .map((item) => item.text);
      const overflow = rows
        .filter((node) => node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1)
        .map((node) => node.innerText.replace(/\s+/g, " ").trim().slice(0, 48));
      const hits: string[] = [];
      for (let i = 0; i < visible.length; i += 1) {
        for (let j = i + 1; j < visible.length; j += 1) {
          const a = visible[i].seen;
          const b = visible[j].seen;
          const overlap =
            a.x < b.x + b.width - 1 &&
            a.x + a.width > b.x + 1 &&
            a.y < b.y + b.height - 1 &&
            a.y + a.height > b.y + 1;
          const contains =
            (a.x <= b.x && a.y <= b.y && a.x + a.width >= b.x + b.width && a.y + a.height >= b.y + b.height) ||
            (b.x <= a.x && b.y <= a.y && b.x + b.width >= a.x + a.width && b.y + b.height >= a.y + a.height);
          if (overlap && !contains) hits.push(`${visible[i].text} ∩ ${visible[j].text}`);
        }
      }
      return { clipped: [...clipped, ...overflow], hits };
    });
    expect(collisions.clipped, JSON.stringify(collisions.clipped)).toEqual([]);
    expect(collisions.hits, JSON.stringify(collisions.hits)).toEqual([]);
  });

  test("inline approve, decline, and the docked composer work without lifting", async ({ page }, info) => {
    test.skip(info.project.name === "tablet-landscape", "portrait and desktop cover the sheet");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/team/hale-design-lab");
    const last = page.locator(".machine-line").last();
    await expect(last).toContainText("I can publish the forge note");
    await expect(page.locator(".paper-slot")).toHaveAttribute("data-pose", "desk");

    const approve = page.locator("[data-approval='inline'] [data-choice='approve']");
    const target = await approve.evaluate((el) => ({ w: el.offsetWidth, h: el.offsetHeight }));
    expect(target.w >= 44 && target.h >= 44).toBe(true);
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
