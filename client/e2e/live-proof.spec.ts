import { copyFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { PAPER_SETTLE_MS } from "../src/study/paperSettle";

/**
 * Milestone 1 walkthrough at the PR #18 tip.
 *
 * Present: splash, hall, Work/School toggle, door-open, CEO paper, overview desks,
 * a desk's paper chat, Library bookcase, Team board stapler and tools, school
 * learning desk, Ponder lift, current-path book, approval slip.
 *
 * Not in the product, so this spec does not invent them:
 * - The stapler and tools menu live on the Team board, not on a desk.
 * - The school desk has a book and no bookcase. The bookcase is the Library shelf.
 */

const shotDir = "../docs/screenshots/live-proof";
const artifactDir = "/opt/cursor/artifacts/screenshots/live-proof";
mkdirSync(shotDir, { recursive: true });
mkdirSync(artifactDir, { recursive: true });

const passes = [
  { name: "reduced-motion", reducedMotion: "reduce", grayscale: false, shots: true },
  { name: "motion", reducedMotion: "no-preference", grayscale: false, shots: false },
  { name: "grayscale", reducedMotion: "reduce", grayscale: true, shots: false },
] as const;

type Pass = (typeof passes)[number];

test.describe("milestone 1 live path", () => {
  for (const pass of passes) {
    test(`${pass.name} walks splash through approval`, async ({ page }, info) => {
      const proj = info.project.name;
      test.skip(proj !== "tablet-portrait" && proj !== "desktop", "tablet portrait and desktop");
      test.setTimeout(90_000);
      const keys = proj === "desktop" && pass.name === "reduced-motion";
      const guard = watch(page);

      await page.emulateMedia({ reducedMotion: pass.reducedMotion });
        if (pass.grayscale) {
        await page.addInitScript(() => {
          const paint = () => {
            const root = document.documentElement;
            if (!root) return;
            root.style.filter = "grayscale(1)";
          };
          if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paint);
          paint();
        });
      }

      await page.goto("/");
      await assertQuiet(page, guard);

      await test.step("splash", async () => {
        await expect(page.getByRole("heading", { name: "Spark of Freedom" })).toBeVisible();
        await expect(page.getByRole("img", { name: "Spark of Freedom flame" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
        await shot(page, pass, proj, "01-splash");
        await assertQuiet(page, guard);
        if (keys) await page.keyboard.press("Enter");
        else await page.getByRole("button", { name: "Continue" }).click();
        await expect(page).toHaveURL(/\/home$/);
      });

      await test.step("hall and work/school toggle", async () => {
        await expect(page.locator("[data-hall=void]")).toBeVisible();
        await expect(page.locator(".app")).toHaveAttribute("data-layout", proj === "desktop" ? "desktop" : "portrait");
        await expect(page.getByRole("tab", { name: "Work" })).toHaveAttribute("aria-selected", "true");
        await expect(page.locator(".door-grid")).toHaveAttribute("data-count", "3");
        await expect(page.getByRole("button", { name: "Open Hale Design Lab" })).toBeVisible();
        await shot(page, pass, proj, "02-hall-work");
        await assertQuiet(page, guard);

        if (keys) {
          await page.keyboard.press("Tab");
          await expect(page.getByRole("link", { name: "Settings" })).toBeFocused();
          await page.keyboard.press("Tab");
          await expect(page.getByRole("button", { name: "Open Hale Design Lab" })).toBeFocused();
          await page.keyboard.press("Tab");
          await page.keyboard.press("Tab");
          await page.keyboard.press("Tab");
          await expect(page.getByRole("tab", { name: "Work" })).toBeFocused();
          await page.keyboard.press("ArrowRight");
        } else {
          await page.getByRole("tab", { name: "School" }).click();
        }
        await expect(page.getByRole("tab", { name: "School" })).toHaveAttribute("aria-selected", "true");
        await expect(page.locator(".door-grid")).toHaveAttribute("data-count", "2");
        await expect(page.getByRole("button", { name: "Open Reading Room" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Open Hale Design Lab" })).toHaveCount(0);
        await shot(page, pass, proj, "03-hall-school");
        await assertQuiet(page, guard);

        if (keys) {
          await page.keyboard.press("Home");
          await expect(page.getByRole("tab", { name: "Work" })).toBeFocused();
        } else {
          await page.getByRole("tab", { name: "Work" }).click();
        }
        await expect(page.getByRole("button", { name: "Open Hale Design Lab" })).toBeVisible();
      });

      await test.step("work door opens into CEO chat", async () => {
        const door = page.getByRole("button", { name: "Open Hale Design Lab" });
        if (pass.reducedMotion === "reduce") await armPhaseWatch(page, "hale-design-lab");
        if (keys) {
          await page.keyboard.press("Shift+Tab");
          await page.keyboard.press("Shift+Tab");
          await page.keyboard.press("Shift+Tab");
          await expect(door).toBeFocused();
          await page.keyboard.press("Enter");
        } else {
          await door.click();
        }
        if (pass.reducedMotion === "reduce") {
          await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
          expect(await swung(page)).toBe(false);
        } else {
          await expect(door).toHaveAttribute("data-phase", "swing");
          await expect(page).toHaveURL(/\/home$/);
          await shot(page, pass, proj, "04-door-open", true);
          await expect(page).toHaveURL(/\/team\/hale-design-lab$/, { timeout: 4000 });
        }
        await settled(page);
        const room = page.locator(".route-content .study");
        await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
        await expect(room).toHaveAttribute("data-lamp", "working");
        await expect(room.locator(".lamp-spot .status-chip")).toHaveText("Working");
        await expect(page.locator(".machine-line").first()).toContainText("generated · not verified");
        await shot(page, pass, proj, "05-ceo-chat");
        await assertQuiet(page, guard);
      });

      await test.step("overview desks", async () => {
        const overview = page.getByRole("tab", { name: "Overview" });
        if (keys) {
          await page.getByRole("tab", { name: "CEO" }).focus();
          await page.keyboard.press("End");
          await expect(overview).toBeFocused();
        } else {
          await overview.click();
        }
        await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
        await expect(page.locator(".agent-desk[data-agent='ceo']")).toHaveAttribute("data-status", "working");
        await expect(page.locator(".agent-desk[data-agent='ceo'] .status-chip")).toHaveText("Working");
        await expect(page.locator(".agent-desk[data-agent='atelier'] .status-chip")).toHaveText("Idle");
        await expect(page.locator(".agent-desk[data-agent='courier'] .status-chip")).toHaveText("Failed");
        await shot(page, pass, proj, "06-overview");
        await assertQuiet(page, guard);
      });

      await test.step("desk paper chat", async () => {
        const desk = page.locator(".agent-desk[data-agent='atelier']");
        if (keys) {
          await page.keyboard.press("Tab");
          await expect(page.locator(".agent-desk[data-agent='ceo']")).toBeFocused();
          await page.keyboard.press("Tab");
          await expect(desk).toBeFocused();
          await page.keyboard.press("Enter");
        } else {
          await desk.click();
        }
        await expect(page.getByRole("heading", { name: "Atelier chat" })).toBeVisible();
        await expect(page.locator(".route-content .study")).toHaveAttribute("data-room", "team");
        await expect(page.locator(".route-content .stapler")).toHaveCount(0);
        await shot(page, pass, proj, "07-desk-chat");
        await assertQuiet(page, guard);
      });

      await test.step("library bookcase", async () => {
        if (keys) {
          await page.getByRole("button", { name: "Back" }).focus();
          await page.keyboard.press("Tab");
          await expect(page.getByRole("button", { name: "Library" })).toBeFocused();
          await page.keyboard.press("Enter");
        } else {
          await page.getByRole("button", { name: "Library" }).click();
        }
        await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
        await expect(page.locator(".bookcase")).toBeVisible();
        await expect(page.getByRole("button", { name: "Place a sheet" })).toBeVisible();
        await shot(page, pass, proj, "08-library-bookcase");
        await assertQuiet(page, guard);
        await pressBack(page, keys);
        await expect(page.getByRole("heading", { name: "Atelier chat" })).toBeVisible();
      });

      await test.step("team board stapler and tools", async () => {
        if (keys) {
          await page.getByRole("button", { name: "Back" }).focus();
          await page.keyboard.press("Tab");
          await page.keyboard.press("Tab");
          await expect(page.getByRole("button", { name: "Team" })).toBeFocused();
          await page.keyboard.press("Enter");
        } else {
          await page.getByRole("button", { name: "Team" }).click();
        }
        await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
        await expect(page.locator(".plaque")).toHaveCount(3);
        await shot(page, pass, proj, "09-team-board");
        if (keys) {
          await page.keyboard.press("Tab");
          await page.keyboard.press("Tab");
          await page.keyboard.press("Tab");
          await page.keyboard.press("Tab");
          await expect(page.getByRole("button", { name: "Stapler" })).toBeFocused();
          await page.keyboard.press("Enter");
        } else {
          await page.getByRole("button", { name: "Stapler" }).click();
        }
        const menu = page.getByRole("menu", { name: "Fixture tools" });
        await expect(menu).toBeVisible();
        await expect(menu.getByRole("menuitem")).toHaveText(["Swatch sheet", "Forge stamp", "Errand slip"]);
        await shot(page, pass, proj, "10-stapler-tools");
        await menu.getByRole("menuitem", { name: "Swatch sheet" }).click();
        await expect(page.getByRole("status")).toHaveText("Label only. Nothing left this board.");
        await page.keyboard.press("Escape");
        await expect(menu).toHaveCount(0);
        await assertQuiet(page, guard);
        await pressBack(page, keys);
        await expect(page.getByRole("heading", { name: "Atelier chat" })).toBeVisible();
        await pressBack(page, keys);
        await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
        await pressBack(page, keys);
        await expect(page).toHaveURL(/\/home$/);
        await settled(page);
        await expect(page.getByRole("button", { name: "Open Hale Design Lab" })).toBeFocused();
        await shot(page, pass, proj, "11-hall-return");
        await assertQuiet(page, guard);
      });

      await test.step("school door, ponder, and the current path", async () => {
        const schoolDoor = page.getByRole("button", { name: "Open Reading Room" });
        if (keys) {
          await page.getByRole("tab", { name: "Work" }).focus();
          await page.keyboard.press("ArrowRight");
          await expect(page.getByRole("tab", { name: "School" })).toBeFocused();
          await page.keyboard.press("Shift+Tab");
          await page.keyboard.press("Shift+Tab");
          await expect(schoolDoor).toBeFocused();
          await page.keyboard.press("Enter");
        } else {
          await page.getByRole("tab", { name: "School" }).click();
          await schoolDoor.click();
        }
        if (pass.reducedMotion === "no-preference") {
          await expect(schoolDoor).toHaveAttribute("data-phase", "swing");
          await expect(page).toHaveURL(/\/home$/);
          await shot(page, pass, proj, "12-school-door-open", true);
        }
        await expect(page).toHaveURL(/\/learn\/reading-room$/, { timeout: 4000 });
        await settled(page);
        const learn = page.locator(".route-content .learn-room");
        await expect(learn).toHaveAttribute("data-room", "learn");
        await expect(learn.locator(".desk-top")).toBeVisible();
        await expect(learn.locator(".desk-apron")).toBeVisible();
        await expect(learn.locator(".lamp-spot .status-chip")).toHaveText("Working");
        await expect(learn.locator(".bookcase")).toHaveCount(0);
        await shot(page, pass, proj, "13-learning-desk");
        await assertQuiet(page, guard);

        const sheet = page.locator(".paper-log");
        if (keys) {
          await page.getByRole("button", { name: "Back" }).focus();
          await page.keyboard.press("Tab");
          await expect(sheet).toBeFocused();
          await page.keyboard.press("Enter");
        } else {
          await page.getByText("A blank sheet. Lift it to write.").click();
        }
        await expect(learn).toHaveAttribute("data-paper", "lifted");
        await expect(learn).toHaveAttribute("data-focus", "sheet");
        await expect(page.getByLabel("Your note")).toBeVisible();
        await expect(page.getByRole("button", { name: "Keep this note" })).toBeVisible();
        await shot(page, pass, proj, "14-ponder-lift");
        await assertQuiet(page, guard);
        await paperSettled(page, "lifted");
        await page.getByRole("button", { name: "Set it down" }).click();
        await paperSettled(page, "desk");

        const book = page.getByRole("button", { name: "Open the current path" });
        await book.click();
        await expect(page.getByRole("heading", { name: "Reading Room path" })).toBeVisible();
        await expect(page.getByText("A fixture. No course is loaded.")).toBeVisible();
        await expect(page.getByText("Sit with one page")).toBeVisible();
        await shot(page, pass, proj, "15-book-path");
        await assertQuiet(page, guard);
        await page.keyboard.press("Escape");
        await expect(page.getByRole("heading", { name: "Reading Room path" })).toHaveCount(0);
        await expect(book).toBeFocused();
        await pressBack(page, keys);
        await expect(page).toHaveURL(/\/home$/);
        await settled(page);
        await expect(page.getByRole("button", { name: "Open Reading Room" })).toBeFocused();
      });

      await test.step("approval slip does not run", async () => {
        await page.getByRole("tab", { name: "Work" }).click();
        const door = page.getByRole("button", { name: "Open Hale Design Lab" });
        await door.click();
        await expect(page).toHaveURL(/\/team\/hale-design-lab$/, { timeout: 4000 });
        await settled(page);
        await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
        await page.getByLabel("Message the CEO").fill("Approve");
        await page.getByRole("button", { name: "Send" }).click();
        await expect(page.getByText("Approve", { exact: true })).toBeVisible();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(page.locator(".ran-nothing")).toHaveCount(0);

        await page.getByRole("button", { name: "Publish the forge note" }).click();
        const dialog = page.getByRole("dialog", { name: "Approve this action?" });
        await expect(dialog).toBeVisible();
        await expect(dialog.locator("button")).toHaveText(["Decline", "Approve"]);
        await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(1);
        await expect(page.getByRole("button", { name: "Decline" })).toBeFocused();
        await shot(page, pass, proj, "16-approval-overlay");
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await expect(page.getByRole("status")).toHaveText("Declined. Nothing ran.");
        await expect(page).toHaveURL(/\/team\/hale-design-lab$/);

        await page.getByRole("button", { name: "Publish the forge note" }).click();
        await expect(dialog).toBeVisible();
        await page.getByRole("button", { name: "Approve" }).click();
        await expect(dialog).toHaveCount(0);
        await expect(page.getByRole("status")).toHaveText("Approved. Nothing ran.");
        await expect(page).toHaveURL(/\/team\/hale-design-lab$/);
        expect(guard.calls).toEqual([]);
        expect(await vaultCounts(page)).toEqual({ human: 0, machine: 0 });
        await assertQuiet(page, guard);
      });

      expect(guard.errors, guard.errors.join("\n")).toEqual([]);
      expect(guard.failed, guard.failed.join("\n")).toEqual([]);
    });
  }
});

function watch(page: Page) {
  const origin = new URL(process.env.FOUNDER_PREVIEW_URL || "http://127.0.0.1:5173").origin;
  const guard = { errors: [] as string[], failed: [] as string[], calls: [] as string[] };
  page.on("pageerror", (error) => guard.errors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") guard.errors.push(msg.text());
  });
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/api/") || url.includes("/notes") || url.includes("/tasks")) guard.calls.push(url);
  });
  page.on("response", (res) => {
    let url: URL;
    try {
      url = new URL(res.url());
    } catch {
      return;
    }
    if (url.origin !== origin || res.status() < 400) return;
    guard.failed.push(`${res.status()} ${url.pathname}`);
  });
  page.on("requestfailed", (req) => {
    const reason = req.failure()?.errorText ?? "";
    if (reason.includes("ERR_ABORTED")) return;
    let url: URL;
    try {
      url = new URL(req.url());
    } catch {
      return;
    }
    if (url.origin !== origin) return;
    guard.failed.push(`${reason} ${url.pathname}`);
  });
  return guard;
}

async function shot(page: Page, pass: Pass, proj: string, name: string, force = false) {
  if (!pass.shots && !force) return;
  const file = `${shotDir}/${name}-${proj}.png`;
  await page.screenshot({ path: file, animations: force ? "allow" : "disabled" });
  copyFileSync(file, `${artifactDir}/${name}-${proj}.png`);
}

async function assertQuiet(page: Page, guard: { errors: string[]; failed: string[] }) {
  expect(guard.errors, guard.errors.join("\n")).toEqual([]);
  expect(guard.failed, guard.failed.join("\n")).toEqual([]);
  const overflow = await page.evaluate(() => ({
    root: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  expect(overflow.root).toBeLessThanOrEqual(1);
  expect(overflow.body).toBeLessThanOrEqual(1);
  const project = test.info().project.name;
  if (project !== "tablet-portrait") return;
  const small = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll<HTMLElement>("button, a, textarea, input, [role='tab'], [role='menuitem']")];
    return nodes.flatMap((el) => {
      if (el.closest("[aria-hidden='true']")) return [];
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none") return [];
      const hiddenByParent = Boolean(el.closest("[style*='pointer-events: none'], .room-portal-layer"));
      if (hiddenByParent) return [];
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      if (width < 1 || height < 1) return [];
      if (width >= 44 && height >= 44) return [];
      const name = el.getAttribute("aria-label") || el.textContent?.trim().replace(/\s+/g, " ").slice(0, 48) || el.tagName;
      return [`${name} ${width}x${height}`];
    });
  });
  expect(small, small.join("\n")).toEqual([]);
}

async function settled(page: Page) {
  await expect(page.locator(".room-portal-layer")).toHaveCount(0);
}

/** Lift and set-down play for PAPER_SETTLE_MS. Read the pose only after that motion stops. */
async function paperSettled(page: Page, pose: "desk" | "lifted") {
  const learn = page.locator(".route-content .learn-room");
  const slot = learn.locator(".paper-slot");
  const timeout = PAPER_SETTLE_MS + 400;
  await expect(learn).toHaveAttribute("data-paper", pose, { timeout });
  if ((await slot.getAttribute("data-still")) === "true") return;
  await slot.evaluate(async (el) => {
    const finished = () =>
      Promise.all(
        el
          .getAnimations()
          .filter((animation) => animation.playState === "running")
          .map((animation) => animation.finished.catch(() => undefined)),
      );
    await finished();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    await finished();
  });
  await expect(slot).not.toHaveAttribute("data-settle", { timeout });
}

async function pressBack(page: Page, keys: boolean) {
  const back = page.getByRole("button", { name: "Back" });
  if (keys) {
    await back.focus();
    await page.keyboard.press("Enter");
    return;
  }
  await back.click();
}

async function armPhaseWatch(page: Page, doorId: string) {
  await page.evaluate((id) => {
    const door = document.querySelector(`[data-door-id="${id}"]`);
    const record = { swung: false };
    (window as unknown as { __door?: { swung: boolean } }).__door = record;
    if (!door) return;
    new MutationObserver(() => {
      const phase = door.getAttribute("data-phase");
      if (phase === "swing" || phase === "dolly") record.swung = true;
    }).observe(door, { attributes: true, attributeFilter: ["data-phase"] });
  }, doorId);
}

async function swung(page: Page) {
  return page.evaluate(() => (window as unknown as { __door?: { swung: boolean } }).__door?.swung ?? false);
}

async function vaultCounts(page: Page) {
  return page.evaluate(async () => {
    const known = (await indexedDB.databases?.()) ?? [];
    if (!known.some((db) => db.name === "FounderOSLocalDB")) return { human: 0, machine: 0 };
    const open = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("FounderOSLocalDB");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const count = (name: string) =>
      new Promise<number>((resolve, reject) => {
        if (!open.objectStoreNames.contains(name)) {
          resolve(0);
          return;
        }
        const tx = open.transaction(name, "readonly");
        const req = tx.objectStore(name).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    const human = await count("humanNotes");
    const machine = await count("machineNotes");
    open.close();
    return { human, machine };
  });
}
