import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { founderEmber, schoolAccent } from "../src/design/palette";

const shotDir = "../docs/screenshots/coherence";
mkdirSync(shotDir, { recursive: true });

const ember = Object.values(founderEmber).map((hex) => hex.slice(1).toLowerCase());
const school = Object.values(schoolAccent).map((hex) => hex.slice(1).toLowerCase());

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

async function assertCoherent(page: Page, label: string, required: string[]) {
  const problems = await page.evaluate(
    ({ label, required, ember, school }) => {
      const issues: string[] = [];
      const doc = document.documentElement;
      const hx = doc.scrollWidth - doc.clientWidth;
      const bx = document.body.scrollWidth - document.body.clientWidth;
      if (hx > 1) issues.push(`${label} document overflow ${hx}px`);
      if (bx > 1) issues.push(`${label} body overflow ${bx}px`);

      const seen = (el: Element) => {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
        const box = el.getBoundingClientRect();
        return box.width > 1 && box.height > 1;
      };
      const ratio = (el: Element) => {
        const box = el.getBoundingClientRect();
        const iw = Math.max(0, Math.min(box.right, innerWidth) - Math.max(box.left, 0));
        const ih = Math.max(0, Math.min(box.bottom, innerHeight) - Math.max(box.top, 0));
        return (iw * ih) / Math.max(1, box.width * box.height);
      };
      for (const sel of required) {
        const el = [...document.querySelectorAll(sel)].find(seen);
        if (!el) {
          issues.push(`${label} missing ${sel}`);
          continue;
        }
        const cover = ratio(el);
        if (cover < 0.9) issues.push(`${label} ${sel} only ${Math.round(cover * 100)}% in view`);
      }

      const hexOf = (css: string) => {
        const match = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        if (!match) return null;
        return [match[1], match[2], match[3]].map((part) => Number(part).toString(16).padStart(2, "0")).join("");
      };
      const schoolRoom = (el: Element) =>
        !!el.closest(".learn-room, .path-panel, .path-map, .hall[data-place='school'], [data-place='learn'], [data-place='school']");
      const sample = document.querySelectorAll(
        "body, .pixel-bar, .study-bar, .mail-board, .mail-plaque, .mail-tray, .mail-slip, .desk-drawer, .desk-drawer-row, .ledger-sheet, .ledger-option, .pipeline-room, .path-node, .overview-sheet, .agent-desk-plaque, .shelf-plate, .plaque, .board-slip, .approval-slip, button, a.text-link",
      );
      const flagged = new Set<string>();
      for (const el of sample) {
        if (!seen(el)) continue;
        const style = getComputedStyle(el);
        const allowSchool = schoolRoom(el);
        const paints: [string, string][] = [
          ["color", style.color],
          ["background", style.backgroundColor],
        ];
        if (parseFloat(style.borderTopWidth) >= 1) paints.push(["border", style.borderTopColor]);
        for (const [prop, value] of paints) {
          if (!value || value === "transparent" || value === "rgba(0, 0, 0, 0)") continue;
          const hex = hexOf(value);
          if (!hex) continue;
          if (ember.includes(hex)) continue;
          if (allowSchool && school.includes(hex)) continue;
          const key = `${el.className}|${prop}|${hex}`;
          if (flagged.has(key)) continue;
          flagged.add(key);
          issues.push(`${label} off-palette ${prop} #${hex} on ${String(el.className).slice(0, 48) || el.tagName}`);
        }
      }

      const controls = document.querySelectorAll("button, a[href], [role='option'], [role='tab'], [role='switch'], [role='menuitem']");
      for (const el of controls) {
        if (!seen(el)) continue;
        const box = el.getBoundingClientRect();
        if (box.bottom < 0 || box.top > innerHeight || box.right < 0 || box.left > innerWidth) continue;
        if (box.width >= 44 && box.height >= 44) continue;
        const name = (el.getAttribute("aria-label") || el.textContent || el.tagName).replace(/\s+/g, " ").trim().slice(0, 48);
        issues.push(`${label} target ${Math.round(box.width)}x${Math.round(box.height)} ${name}`);
      }
      return issues;
    },
    { label, required, ember, school },
  );
  expect(problems, problems.join("\n")).toEqual([]);
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${shotDir}/${name}.png`, animations: "disabled" });
}

test("walks the stacked rooms without a collision or a vault write", async ({ page }, info) => {
  test.setTimeout(150_000);
  const proj = info.project.name;
  const keep = proj === "desktop" || proj === "tablet-portrait";
  const gray = proj === "desktop";
  await page.emulateMedia({ reducedMotion: "reduce" });
  const writes: string[] = [];
  page.on("request", (req) => {
    if (req.method() !== "GET" && req.method() !== "HEAD") writes.push(`${req.method()} ${req.url()}`);
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Spark of Freedom" })).toBeVisible();
  const before = await vaultCounts(page);
  await assertCoherent(page, "boot", [".splash", ".wordmark"]);
  await expect(page.locator(".splash")).toBeVisible();
  if (keep) await shot(page, `boot-${proj}`);

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("button", { name: /Hale Design Lab/ })).toBeVisible();
  await expect(page.locator(".hall")).toHaveAttribute("data-frames", "1");
  await assertCoherent(page, "hall-work", [".pixel-bar", ".door-grid", ".wordmark"]);
  if (keep) await shot(page, `hall-work-${proj}`);

  await page.getByRole("tab", { name: "School" }).click();
  await expect(page.getByRole("button", { name: /Reading Room/ })).toBeVisible();
  await assertCoherent(page, "hall-school", [".pixel-bar", ".door-grid"]);
  if (keep) await shot(page, `hall-school-${proj}`);

  await page.getByRole("tab", { name: "Work" }).click();
  await page.getByRole("button", { name: /Hale Design Lab/ }).click();
  await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
  await assertCoherent(page, "chat", [".pixel-bar", ".study"]);
  if (keep) await shot(page, `chat-${proj}`);

  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.locator(".desk-grid")).toHaveAttribute("data-still", "true");
  await expect(page.locator(".mail-slot")).toHaveAttribute("data-frames", "1");
  await expect(page.locator(".pipeline-rooms")).toHaveAttribute("data-frames", "1");
  await assertCoherent(page, "overview", [".pixel-bar", ".mail-mouth", ".pipeline-rooms", ".desk-room"]);
  if (keep) await shot(page, `overview-${proj}`);

  await page.locator(".desk-drawer-pull").first().click();
  await expect(page.locator(".desk-drawer")).toBeVisible();
  await assertCoherent(page, "drawer", [".pixel-bar", ".desk-drawer", ".pipeline-rooms"]);
  if (keep) await shot(page, `drawer-${proj}`);
  await page.keyboard.press("Escape");
  await expect(page.locator(".desk-drawer")).toHaveCount(0);

  await page.locator(".mail-mouth").click();
  await expect(page.locator(".mail-tray")).toBeVisible();
  await page.keyboard.press("j");
  await expect(page.locator(".mail-slip").nth(1)).toHaveAttribute("aria-selected", "true");
  await assertCoherent(page, "mail", [".pixel-bar", ".mail-tray", ".pipeline-rooms"]);
  if (keep) await shot(page, `mail-${proj}`);

  await page.keyboard.press("Control+k");
  const ledger = page.getByRole("dialog", { name: "Command ledger" });
  await expect(ledger).toBeVisible();
  await expect(ledger).toHaveAttribute("data-frames", "1");
  await expect(page.locator(".mail-tray")).toBeVisible();
  await expect(ledger).toHaveAttribute("data-modal", "true");
  await page.keyboard.press("Tab");
  const focusStay = await page.evaluate(() => ({
    modal: document.querySelector("dialog.command-ledger")?.getAttribute("data-modal"),
    open: (document.querySelector("dialog.command-ledger") as HTMLDialogElement | null)?.open ?? false,
    inside: !!document.activeElement?.closest(".command-ledger"),
    active: `${document.activeElement?.tagName ?? ""} ${document.activeElement?.className ?? ""}`.slice(0, 80),
  }));
  expect(focusStay.inside, JSON.stringify(focusStay)).toBe(true);
  await assertCoherent(page, "ledger", [".ledger-sheet"]);
  if (keep) await shot(page, `ledger-${proj}`);
  await page.keyboard.press("Escape");
  await expect(ledger).toHaveCount(0);
  await expect(page.locator(".mail-tray")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".mail-tray")).toHaveCount(0);

  await page.getByRole("button", { name: /Working,/ }).click();
  await expect(page.locator(".desk-grid")).toHaveAttribute("data-pipeline", "working");
  await assertCoherent(page, "pipeline", [".pipeline-rooms", ".pixel-bar"]);
  if (keep) await shot(page, `pipeline-${proj}`);
  await page.getByRole("button", { name: /Working,/ }).click();
  await expect(page.locator(".desk-grid")).toHaveAttribute("data-pipeline", "all");

  await page.getByRole("button", { name: "Team" }).click();
  await expect(page.locator(".team-board")).toBeVisible();
  await assertCoherent(page, "team", [".pixel-bar"]);
  if (keep) await shot(page, `team-${proj}`);
  await page.locator(".stapler").scrollIntoViewIfNeeded();
  await expect(page.locator(".stapler")).toBeInViewport();
  await page.getByRole("button", { name: "Swap seat" }).first().click();
  await expect(page.locator(".board-overlay")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".board-overlay")).toHaveCount(0);

  await page.getByRole("button", { name: "Library" }).click();
  await expect(page.locator(".library-room")).toBeVisible();
  await assertCoherent(page, "library", [".pixel-bar", ".library-room"]);
  if (keep) await shot(page, `library-${proj}`);
  await page.getByRole("button", { name: "Place a sheet" }).click();
  await expect(page.locator(".library-paper")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".library-paper")).toHaveCount(0);

  await page.goto("/work/overview?agent=ceo");
  await expect(page.locator(".overview-sheet")).toBeVisible();
  await expect(page.getByRole("heading", { name: "CEO chat" })).toBeVisible();
  await assertCoherent(page, "deep-agent", [".pixel-bar", ".overview-sheet"]);
  if (keep) await shot(page, `deep-agent-${proj}`);
  await page.keyboard.press("Control+k");
  await expect(ledger).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(ledger).toHaveCount(0);
  await expect(page.locator(".overview-sheet")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".overview-sheet")).toHaveCount(0);

  await page.goto("/school/path?node=task-one-page");
  await expect(page.locator(".path-panel")).toBeVisible();
  await expect(page.locator(".path-map")).toHaveAttribute("data-frames", "1");
  await expect(page.locator(".path-sheet, .path-node[aria-expanded='true']").first()).toBeVisible();
  await assertCoherent(page, "path", [".path-panel", ".path-map"]);
  if (keep) await shot(page, `path-${proj}`);
  await page.keyboard.press("Escape");
  await expect(page.locator(".path-map")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".path-panel")).toHaveCount(0);

  await page.goto("/learn/reading-room");
  await expect(page.getByRole("heading", { name: "Ponder" })).toBeVisible();
  await expect(page.locator(".book-prop")).toBeVisible();
  await assertCoherent(page, "reading", [".pixel-bar", ".learn-room", ".book-prop"]);
  if (keep) await shot(page, `reading-${proj}`);

  if (proj === "desktop") {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/work/overview");
    await expect(page.locator(".pipeline-rooms")).toHaveAttribute("data-frames", "2");
    await expect(page.locator(".mail-slot")).toHaveAttribute("data-frames", "4");
    await page.emulateMedia({ reducedMotion: "reduce" });
  }

  expect(writes, writes.join("\n")).toEqual([]);
  expect(await vaultCounts(page)).toEqual(before);
  expect(before).toEqual({ human: 0, machine: 0 });

  if (gray) {
    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    const grayRooms: [string, string][] = [
      ["/", "boot"],
      ["/home", "hall-work"],
      ["/work/overview", "overview"],
      ["/work/library", "library"],
      ["/team/hale-design-lab", "chat"],
      ["/school/path", "path"],
      ["/learn/reading-room", "reading"],
    ];
    for (const [url, name] of grayRooms) {
      await page.goto(url);
      await page.locator("h1, h2, .wordmark").first().waitFor();
      await page.evaluate(() => {
        document.documentElement.style.filter = "grayscale(1)";
      });
      await shot(page, `${name}-grayscale`);
    }
    await page.goto("/home");
    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    await page.getByRole("tab", { name: "School" }).click();
    await expect(page.getByRole("button", { name: /Reading Room/ })).toBeVisible();
    await shot(page, "hall-school-grayscale");
    await page.goto("/work/overview");
    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    await page.locator(".mail-mouth").click();
    await expect(page.locator(".mail-tray")).toBeVisible();
    await shot(page, "mail-grayscale");
    await page.keyboard.press("Escape");
    await page.locator(".desk-drawer-pull").first().click();
    await expect(page.locator(".desk-drawer")).toBeVisible();
    await shot(page, "drawer-grayscale");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Team" }).click();
    await expect(page.locator(".team-board")).toBeVisible();
    await shot(page, "team-grayscale");
    await page.keyboard.press("Control+k");
    await expect(ledger).toBeVisible();
    await shot(page, "ledger-grayscale");
    expect(await vaultCounts(page)).toEqual(before);
  }
});
