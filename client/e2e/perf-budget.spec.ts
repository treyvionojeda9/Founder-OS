import { expect, test, type Page } from "@playwright/test";

/**
 * Tablet portrait, 4× CPU, DevTools Fast 3G throughput.
 * Budgets are the worst measured sample after the perf pass, plus about 20%.
 * The 1.5s splash hold is part of boot-to-interactive. It is the product timer.
 */
const FAST_3G = {
  offline: false,
  latency: 150 * 3.75,
  downloadThroughput: (1.6 * 1000 * 1000) / 8 * 0.9,
  uploadThroughput: (750 * 1000) / 8 * 0.9,
};

const BOOT_TO_DOORS_MS = 4_650;
/** Several short tasks from mounting the room, not one multi-hundred-millisecond sprite paint. */
const DOOR_LONG_TASKS = 10;
const DOOR_LONG_TOTAL_MS = 900;
/** The open used to issue ~97k fillRect calls. The cached 1× raster stays near 600. */
const DOOR_FILL_RECT = 2_500;

const ROOMS: {
  label: string;
  budget: number;
  setup?: (page: Page) => Promise<void>;
  act: (page: Page) => Promise<void>;
  ready: string;
}[] = [
  {
    label: "overview",
    budget: 260,
    act: (page) => page.getByRole("tab", { name: "Overview" }).click(),
    ready: ".desk-room",
  },
  {
    label: "desk-drawer",
    budget: 150,
    act: (page) => page.locator(".desk-drawer-pull").first().click(),
    ready: ".desk-drawer",
  },
  {
    label: "mail-tray",
    budget: 160,
    setup: async (page) => {
      await page.keyboard.press("Escape");
      await page.locator(".desk-drawer").waitFor({ state: "detached" });
    },
    act: (page) => page.locator(".mail-mouth").click(),
    ready: ".mail-tray",
  },
  {
    label: "pipeline",
    budget: 160,
    setup: async (page) => {
      await page.keyboard.press("Escape");
      await page.locator(".mail-tray").waitFor({ state: "detached" });
    },
    act: (page) => page.getByRole("button", { name: /Working,/ }).click(),
    ready: '.desk-grid[data-pipeline="working"]',
  },
  {
    label: "team-board",
    budget: 140,
    setup: (page) => page.getByRole("button", { name: /Working,/ }).click(),
    act: (page) => page.getByRole("button", { name: "Team" }).click(),
    ready: ".team-board",
  },
  {
    label: "library",
    budget: 140,
    act: (page) => page.getByRole("button", { name: "Library" }).click(),
    ready: ".library-room",
  },
  {
    label: "overview-from-library",
    budget: 260,
    act: (page) => page.getByRole("button", { name: "Back" }).click(),
    ready: ".desk-room",
  },
  {
    label: "hall-from-overview",
    budget: 720,
    act: (page) => page.getByRole("button", { name: "Back" }).click(),
    ready: ".door-grid",
  },
  {
    label: "reading-room",
    budget: 430,
    setup: async (page) => {
      await page.getByRole("tab", { name: "School" }).click();
      await page.locator('[aria-label="Open Reading Room"]').waitFor();
    },
    act: (page) => page.getByRole("button", { name: /Reading Room/ }).click(),
    ready: '[aria-label="Ponder"]',
  },
  {
    label: "school-path",
    budget: 500,
    act: (page) => page.getByRole("button", { name: "Open the current path" }).click(),
    ready: ".path-map",
  },
  {
    label: "hall-from-reading",
    budget: 880,
    setup: (page) => page.keyboard.press("Escape"),
    act: (page) => page.getByRole("button", { name: "Back" }).click(),
    ready: ".door-grid",
  },
  {
    label: "field-notes",
    budget: 650,
    setup: async (page) => {
      await page.getByRole("tab", { name: "School" }).click();
      await page.locator('[aria-label="Open Field Notes"]').waitFor();
    },
    act: (page) => page.getByRole("button", { name: /Field Notes/ }).click(),
    ready: '[aria-label="Ponder"]',
  },
  {
    label: "command-ledger",
    budget: 260,
    setup: async (page) => {
      await page.getByRole("button", { name: "Back" }).click();
      await page.locator(".door-grid").waitFor();
      await page.getByRole("tab", { name: "Work" }).click();
    },
    act: (page) => page.keyboard.press("Control+k"),
    ready: "dialog.command-ledger",
  },
];

test("stays inside the tablet perf budget", async ({ page }) => {
  const client = await page.context().newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });
  await client.send("Network.emulateNetworkConditions", FAST_3G);
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.addInitScript(() => {
    const tasks: { start: number; dur: number }[] = [];
    (window as unknown as { __longTasks: typeof tasks }).__longTasks = tasks;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) tasks.push({ start: entry.startTime, dur: entry.duration });
    }).observe({ type: "longtask", buffered: true });
  });

  await page.goto("/", { waitUntil: "load" });
  await page.locator('[aria-label="Open Hale Design Lab"]').waitFor({ timeout: 30_000 });
  const boot = await page.evaluate(
    () =>
      new Promise<{ doors: number }>((resolve) => {
        const seen = () => {
          const door = document.querySelector("[data-door-id]");
          const canvas = door?.querySelector("canvas");
          if (!door || !canvas || canvas.width < 1) {
            requestAnimationFrame(seen);
            return;
          }
          requestAnimationFrame(() => resolve({ doors: performance.now() }));
        };
        seen();
      }),
  );
  expect(boot.doors, "boot to interactive doors").toBeLessThan(BOOT_TO_DOORS_MS);
  await page.locator(".space-layer[data-painted='true']").waitFor();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

  await switchRoom(page, {
    label: "school-hall",
    budget: 620,
    act: (current) => current.getByRole("tab", { name: "School" }).click(),
    ready: '[aria-label="Open Reading Room"]',
  });
  await switchRoom(page, {
    label: "work-hall",
    budget: 700,
    act: (current) => current.getByRole("tab", { name: "Work" }).click(),
    ready: '[aria-label="Open Hale Design Lab"]',
  });

  const doorStart = await page.evaluate(() => {
    const proto = CanvasRenderingContext2D.prototype;
    const wrapped = proto as CanvasRenderingContext2D & { __fillWrapped?: boolean };
    if (!wrapped.__fillWrapped) {
      const orig = proto.fillRect;
      proto.fillRect = function (this: CanvasRenderingContext2D, ...args: [number, number, number, number]) {
        (window as unknown as { __fills: number }).__fills += 1;
        return orig.apply(this, args);
      };
      wrapped.__fillWrapped = true;
    }
    (window as unknown as { __fills: number }).__fills = 0;
    return performance.now();
  });
  await page.getByRole("button", { name: /Hale Design Lab/ }).click();
  await page.getByRole("heading", { name: "CEO chat" }).waitFor();
  await page.waitForTimeout(450);
  const door = await page.evaluate((start) => {
    const tasks = (window as unknown as { __longTasks: { start: number; dur: number }[] }).__longTasks.filter(
      (task) => task.start >= start - 30,
    );
    const over = tasks.filter((task) => task.dur > 50);
    return {
      count: over.length,
      total: over.reduce((sum, task) => sum + task.dur, 0),
      durs: over.map((task) => Math.round(task.dur)),
      fills: (window as unknown as { __fills?: number }).__fills ?? 0,
    };
  }, doorStart);
  expect(door.count, `door-open long tasks over 50ms ${door.durs.join(",")}`).toBeLessThanOrEqual(DOOR_LONG_TASKS);
  expect(door.total, "door-open long task total").toBeLessThanOrEqual(DOOR_LONG_TOTAL_MS);
  expect(door.fills, "door-open fillRect calls").toBeLessThanOrEqual(DOOR_FILL_RECT);

  for (const room of ROOMS) await switchRoom(page, room);
});

async function switchRoom(
  page: Page,
  room: {
    label: string;
    budget: number;
    setup?: (page: Page) => Promise<void>;
    act: (page: Page) => Promise<void>;
    ready: string;
  },
) {
  if (room.setup) await room.setup(page);
  const start = await page.evaluate(() => performance.now());
  await room.act(page);
  await page.locator(room.ready).first().waitFor({ state: "visible", timeout: 20_000 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const elapsed = await page.evaluate((from) => performance.now() - from, start);
  expect(elapsed, room.label).toBeLessThan(room.budget);
}
