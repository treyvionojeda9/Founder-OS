import { expect, test, type Page } from "@playwright/test";

/**
 * Tablet portrait, 4× CPU, DevTools Fast 3G throughput.
 * The gate is the median of three cold walks. One sample on a GitHub runner
 * swung past a ceiling that a faster machine's median had cleared: the push
 * run recorded school-hall at 684ms, the PR run recorded overview at 290.5ms.
 * Ceilings sit about 20% above the higher of that runner sample and the
 * three-walk median measured on a 4-vCPU host. See docs/perf-audit.md.
 * The 1.5s splash hold is part of boot-to-interactive. It is the product timer.
 */
const FAST_3G = {
  offline: false,
  latency: 150 * 3.75,
  downloadThroughput: ((1.6 * 1000 * 1000) / 8) * 0.9,
  uploadThroughput: ((750 * 1000) / 8) * 0.9,
};

const WALKS = 3;

const BOOT_TO_DOORS_MS = 4_680;
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
    budget: 360,
    act: (page) => page.getByRole("tab", { name: "Overview" }).click(),
    ready: ".desk-room",
  },
  {
    label: "desk-drawer",
    budget: 220,
    act: (page) => page.locator(".desk-drawer-pull").first().click(),
    ready: ".desk-drawer",
  },
  {
    label: "mail-tray",
    budget: 180,
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
    budget: 180,
    setup: (page) => page.getByRole("button", { name: /Working,/ }).click(),
    act: (page) => page.getByRole("button", { name: "Team" }).click(),
    ready: ".team-board",
  },
  {
    label: "library",
    budget: 200,
    act: (page) => page.getByRole("button", { name: "Library" }).click(),
    ready: ".library-room",
  },
  {
    label: "overview-from-library",
    budget: 420,
    act: (page) => page.getByRole("button", { name: "Back" }).click(),
    ready: ".desk-room",
  },
  {
    label: "hall-from-overview",
    budget: 1_080,
    act: (page) => page.getByRole("button", { name: "Back" }).click(),
    ready: ".door-grid",
  },
  {
    label: "reading-room",
    budget: 760,
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
    budget: 1_180,
    setup: (page) => page.keyboard.press("Escape"),
    act: (page) => page.getByRole("button", { name: "Back" }).click(),
    ready: ".door-grid",
  },
  {
    label: "field-notes",
    budget: 800,
    setup: async (page) => {
      await page.getByRole("tab", { name: "School" }).click();
      await page.locator('[aria-label="Open Field Notes"]').waitFor();
    },
    act: (page) => page.getByRole("button", { name: /Field Notes/ }).click(),
    ready: '[aria-label="Ponder"]',
  },
  {
    label: "command-ledger",
    budget: 340,
    setup: async (page) => {
      await page.getByRole("button", { name: "Back" }).click();
      await page.locator(".door-grid").waitFor();
      await page.getByRole("tab", { name: "Work" }).click();
    },
    act: (page) => page.keyboard.press("Control+k"),
    ready: "dialog.command-ledger",
  },
];

const HALLS: typeof ROOMS = [
  {
    label: "school-hall",
    budget: 830,
    act: (page) => page.getByRole("tab", { name: "School" }).click(),
    ready: '[aria-label="Open Reading Room"]',
  },
  {
    label: "work-hall",
    budget: 860,
    act: (page) => page.getByRole("tab", { name: "Work" }).click(),
    ready: '[aria-label="Open Hale Design Lab"]',
  },
];

type DoorSample = { count: number; total: number; fills: number };
type WalkSample = { boot: number; door: DoorSample; rooms: Record<string, number> };

test("stays inside the tablet perf budget", async ({ page }) => {
  test.setTimeout(180_000);
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

  const walks: WalkSample[] = [];
  for (let i = 0; i < WALKS; i += 1) walks.push(await oneWalk(page));

  const boot = walks.map((walk) => walk.boot);
  const doorCount = walks.map((walk) => walk.door.count);
  const doorTotal = walks.map((walk) => walk.door.total);
  const doorFills = walks.map((walk) => walk.door.fills);
  const report = {
    boot,
    door: walks.map((walk) => walk.door),
    rooms: Object.fromEntries([...HALLS, ...ROOMS].map((room) => [room.label, walks.map((walk) => walk.rooms[room.label])])),
  };
  console.log(JSON.stringify(report));

  expect(median(boot), `boot to interactive doors ${boot.join(",")}`).toBeLessThan(BOOT_TO_DOORS_MS);
  expect(median(doorCount), `door-open long tasks ${doorCount.join(",")}`).toBeLessThanOrEqual(DOOR_LONG_TASKS);
  expect(median(doorTotal), `door-open long task total ${doorTotal.join(",")}`).toBeLessThanOrEqual(DOOR_LONG_TOTAL_MS);
  expect(median(doorFills), `door-open fillRect calls ${doorFills.join(",")}`).toBeLessThanOrEqual(DOOR_FILL_RECT);
  for (const room of [...HALLS, ...ROOMS]) {
    const samples = walks.map((walk) => walk.rooms[room.label]);
    expect(median(samples), `${room.label} ${samples.join(",")}`).toBeLessThan(room.budget);
  }
});

async function oneWalk(page: Page): Promise<WalkSample> {
  await page.goto("/", { waitUntil: "load" });
  await page.locator('[aria-label="Open Hale Design Lab"]').waitFor({ timeout: 30_000 });
  const boot = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const seen = () => {
          const door = document.querySelector("[data-door-id]");
          const canvas = door?.querySelector("canvas");
          if (!door || !canvas || canvas.width < 1) {
            requestAnimationFrame(seen);
            return;
          }
          requestAnimationFrame(() => resolve(performance.now()));
        };
        seen();
      }),
  );
  await page.locator(".space-layer[data-painted='true']").waitFor();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

  const rooms: Record<string, number> = {};
  for (const room of HALLS) rooms[room.label] = await timeRoom(page, room);

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
      fills: (window as unknown as { __fills?: number }).__fills ?? 0,
    };
  }, doorStart);

  for (const room of ROOMS) rooms[room.label] = await timeRoom(page, room);
  return { boot, door, rooms };
}

async function timeRoom(
  page: Page,
  room: {
    label: string;
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
  return page.evaluate((from) => performance.now() - from, start);
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}
