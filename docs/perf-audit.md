# Tablet performance audit

Measured on the production build before any change, then again after the pass. Both runs use the same harness: Playwright Chromium, tablet portrait 800×1280 at device pixel ratio 2, CPU throttle 4× (`Emulation.setCPUThrottlingRate`), and a Fast 3G-ish network. Download throughput is DevTools Fast 3G aggregate, 180 KB/s (`1.6e6/8×0.9`). Upload is 84 KB/s. The configured latency is 562.5 ms. On this Chromium build that latency does not apply to `127.0.0.1` (resource `responseStart` stayed near 10 ms). The bytes on the wire still match the gzip sizes below, because the harness serves the production `dist` with gzip. The font is sent raw. Three runs, median reported. Long tasks are main-thread tasks over 50 ms.

The splash waits 1500 ms on purpose, then opens the hall. That hold is part of boot-to-interactive. It was not shortened.

## Sizes (gzip)

| Asset | Before | After | What dominates it |
| --- | ---: | ---: | --- |
| Main entry JS | 134,288 | 109,380 | One chunk held React, the hall, and every room. The rooms and the design-system / status-frame pages are separate chunks now. React, the router, Dexie, and the door sprites stay in the entry because the flame and the hall paint them. |
| Room and page chunks | none | 34,363 combined | Team board 11,029, team room 7,635, study stage 4,988, reading room 3,445, lamp 2,168, design system 1,166, status frame 886, settings 359, plus two tiny sprite chunks. Loaded when a door is shown, hovered, or focused, and during the splash wait. |
| CSS | 17,902 | 17,902 | Unchanged. |
| HTML | 269 | 269 | Unchanged. |
| Press Start 2P | 40,130 gzip, 118,204 raw | same | The harness does not gzip the font. Transfer stays 118 KB. |

## Timings and memory

| Metric | Before | After | Cause of the before number |
| --- | ---: | ---: | --- |
| Flame first paint | 2,136 ms | 2,020 ms | Entry download (~1.4 s for 134 KB on the shared 180 KB/s pipe, alongside CSS and the font) plus parse. First paint and first contentful paint land on the flame. |
| Boot to interactive doors | 4,101 ms | 3,872 ms | Flame time, then the 1,500 ms splash hold, then ~450 ms to raster the hall. The hold is the product timer. |
| Door-open long tasks over 50 ms | 5 | 4 | Each parent render passed a fresh `layers` array into every sprite, so the swing repainted the hall. The glimpse, the portal, and the route each mounted a full room and filled ~97,000 rects. |
| Door-open long-task total | 625 ms | 379 ms | Same paints, plus allocating device-pixel canvases. Max frame 383 ms before, 217 ms after. `fillRect` during the open fell from 97,152 to 634. |
| School hall | 662 ms | 359 ms | New door scale (×8) rasterised every face again, with no cached bitmap. |
| Work hall | 731 ms | 405 ms | Same, back at ×7, and a new full-viewport space wash. |
| Overview | 223 ms | 196 ms | One desk room. Not sprite-bound once the chat room is already mounted. |
| Desk drawer | 119 ms | 117 ms | A short transform. No long task. |
| Mail tray | 118 ms | 113 ms | A short transform. No long task. |
| Pipeline filter | 91 ms | 89 ms | A filter on desks already painted. |
| Team board | 119 ms | 105 ms | Plaques and one stapler. No long task. |
| Library | 176 ms | 97 ms | Shelf sprites repainted from scratch. |
| Overview from library | 213 ms | 197 ms | Desks mount again. |
| Hall from overview | 887 ms | 551 ms | The shut plays the room back through the door and the hall sprites rasterise again. |
| Reading room | 496 ms | 344 ms | School door plus the reading-room sprites, mounted more than once. |
| School path | 311 ms | 380 ms | SVG stations, not canvas sprites. The three runs overlap the before run (before also saw 395 ms). Left as noise. |
| Hall from reading | 1,331 ms | 701 ms | Shut animation plus a full hall raster. The slowest room switch before the pass. |
| Field notes | 470 ms | 374 ms | Second school door, same shape as the reading room. |
| Command ledger | 138 ms | 172 ms | A transform on a list. No sprite work. Inside the before/after spread. |
| JS heap after every room | 6.4 MB | 6.1 MB | The heap was never the cost. |
| Canvas backing store after every room | 47.7 MB | 15.7 MB | Each sprite canvas was `grid × scale × device pixel ratio`. Fifty-four of those, plus one viewport-sized wash, were ~48 MB. The wash is still device-sized. The sprites are not. |

Canvas bytes are `sum(canvas.width × canvas.height × 4)` after walking boot, both halls, chat, overview, drawer, mail, pipeline, team, library, both school doors, the path, and the ledger, and landing back on the work hall.

## What changed, and why

The before profile put the time in `fillRect`, `setTransform`, and native canvas work (`(program)`), not in layout. Door and sheet motion were already compositor transforms.

1. **Sprite raster cache, one source pixel per cell.** `Sprite` depended on `layers`, and the default `layers = []` was a new array every render, so a hover or a swing repainted every canvas with per-pixel `fillRect` into a device-pixel buffer. The grid is now rasterised once. The canvas backing store is the grid. CSS scales it by an integer with `image-rendering: pixelated`. Copies blit that raster. The coherence walk was shot again after the pass. Every file in `docs/screenshots/coherence/` matches the previous shots pixel for pixel, including grayscale. Copies of those after shots are in `docs/screenshots/perf/`.

2. **Rooms leave the entry chunk.** `TeamRoom` and `LearnStub` (and settings, the design system, and the status-frame stage) load with `import()`. The splash and the hall start that load. A door also starts it on hover and on focus, which is the touch and keyboard path. Once the module is in memory the glimpse and the portal render it on the same frame, so the swing does not flash an empty opening. While that chunk evaluates it rasters the study and reading-room sprites used at this screen size, so the first open blits instead of filling rects.

3. **Space washes keep one source image.** The 60×40 (or smaller) pattern was rebuilt, and a throwaway canvas allocated, on every paint, including a second paint from `requestAnimationFrame` that read `clientWidth`. The source is cached. A paint at the same size does not allocate again. The on-screen canvas stays at device resolution: stretching the 60×40 grid with CSS is not the same stipple when the viewport is not an integer multiple of the grid (the desktop school hall differed). That wash is the remaining ~16 MB and the remaining long tasks while a room mounts.

4. **Lamp and paper pools are cached** per status and device pixel ratio. They are small next to the door faces.

5. **The door API object is stable** across the swing, so the hall does not re-render on each phase. The team room and the reading room are memoised so a portal update does not walk their trees again.

Door leaves, the room dolly's discrete steps, the overview sheet, the mail tray, the drawer, and the ledger already animate with `transform` and `opacity` (the dolly also steps `clip-path`). Those keyframes were not rewritten.

## Budgets

`npm run bundle-budget` fails if the main entry gzip exceeds 131,270 bytes (109,380 plus about 20%).

`npx playwright test --config=playwright.perf.config.ts` is the throttled tablet walk. It fails if the median boot-to-doors exceeds 4,680 ms, the median door open records more than 10 long tasks or 900 ms of them or more than 2,500 `fillRect` calls (the open used to be ~97,000), or a room-switch median exceeds the ceiling in `e2e/perf-budget.spec.ts`.

## CI gate

The first gate used one sample. That sample moved by room and by runner. The push run failed on the school hall at 684 ms against 620. The PR run failed on overview at 290.5 ms against 260. Nothing else in the client job failed, and the same overview click is not a missed chunk or a sprite decode.

On a 4-vCPU host, with the same 4× throttle, Fast 3G harness, and production build, the overview switch added no resource-timing entries. `drawImage` of the overview wall (a 48×32 wash scaled to a 1520×1060 backing store) returned in under a millisecond. A DevTools trace of that click showed a 65 ms function call in the entry bundle, a 37 ms commit, and 9.5 ms of layout. Roughly 40–55 ms of the old timer was Playwright checking the tab before `pointerdown`. The desk room really does take a couple of hundred milliseconds under 4×, and that cost was already in the lab number (196 ms median). The lab machine was faster in absolute time, so a ceiling 20% over 196 ms (260 ms) sits under a single GitHub sample.

Three cold walks on this host, repeated three times, put the overview median at 242 ms, 266 ms, and 270 ms. The school-hall median was 600 ms, 584 ms, and 557 ms. Individual walks still spike (overview 334 ms from the library, reading room 687 ms, command ledger 275 ms, hall from reading 978 ms, work hall 916 ms). The gate now takes the median of three cold loads, which drops a single spike and still moves when every walk gets slower. The load that recorded work hall at 916 ms had a median of 491 ms.

Ceilings are about 20% above the higher of that median and the GitHub sample that actually failed. Rooms whose walks already spiked on this host use about 20% above the spike, so a slow median still fits. They stay low enough that a real stall does not.

A 400 ms busy loop inside the measured switch, then removed, moved the school-hall median to 935 ms (ceiling 830) and the overview walks to 636 ms, 637 ms, and 701 ms (ceiling 360). Door `fillRect` stayed 634. The sprite ceiling is unchanged.

| Check | Median on this host | Ceiling |
| --- | ---: | ---: |
| Boot to doors | 3,895 ms | 4,680 ms |
| School hall | 546–600 ms (GitHub sample 684) | 830 ms |
| Work hall | 454–492 ms | 860 ms |
| Overview | 242–270 ms (GitHub sample 290.5) | 360 ms |
| Desk drawer | 133–144 ms | 220 ms |
| Mail tray | 103–135 ms | 180 ms |
| Pipeline filter | 106–122 ms | 160 ms |
| Team board | 125–139 ms | 180 ms |
| Library | 125–138 ms | 200 ms |
| Overview from library | 233–263 ms | 420 ms |
| Hall from overview | 754–799 ms | 1,080 ms |
| Reading room | 458–516 ms | 760 ms |
| School path | 303–340 ms | 500 ms |
| Hall from reading | 835–895 ms | 1,180 ms |
| Field notes | 442–462 ms | 800 ms |
| Command ledger | 159–195 ms | 340 ms |
