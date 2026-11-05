# Ponder ink audit

Emulated measurements. These are not the TCL Note A1, and they are not a promise about that device. Pressure, latency, and offline behaviour still have to be checked on the hardware.

The paint path draws each new segment on the canvas inside the pointer handler. React does not re-render per point. Autosave runs on a 200 ms timer after the stroke ends, off that handler. The original is the raw stroke JSON. A PNG preview is stored on the same ink asset only in addition to that JSON.

## Stroke round trip

Vitest, against the local Human Vault (fake-indexeddb). The white paper example is saved and loaded back as the same JSON string, with pressure and without it. `41.0` and `2.0` are JSON numbers, so the stored form is the canonical JSON (`y` is `41`, `width` is `2`), byte for byte, including key order. A point with no `p` does not gain one. A machine principal is refused before `get`, `saveHumanEdit`, or `saveHumanInk`. An invalid stroke is refused the same way, and both stores stay empty.

## 5,000 stroke soak

Vitest 2, jsdom, fake-indexeddb, one `savePonderInk` of 5,000 strokes (three points each, some with pressure) and one `getHumanInk` of the same string. Not the tablet, and not a browser paint.

| | |
| --- | ---: |
| Strokes | 5,000 |
| Raw JSON | 1,041,874 bytes |
| Save | 10.59 ms |
| Load | 0.60 ms |
| Heap delta | 10,944,120 bytes |

The loaded `strokesJson` matched the string that was saved. The heap delta is the live stroke array, the JSON string, and Dexie's copy, measured with `process.memoryUsage().heapUsed` around the save and the load. A second run of the same test recorded save 10.46 ms, load 0.59 ms, and a heap delta of 10,944,168 bytes.

## Input to paint

Playwright Chromium, tablet portrait 800×1280, device pixel ratio 2, CPU throttle 4× (`Emulation.setCPUThrottlingRate`). The dev server on localhost. No network latency was added: the stroke never leaves the page. One pen stroke, 42 segments (pointer down, 40 moves, pointer up). `performance.now()` minus the event's `timeStamp`, taken after that segment's canvas stroke.

| | |
| --- | ---: |
| Segments | 42 |
| Min | 0.0 ms |
| Median | 0.0 ms |
| p95 | 0.70 ms |
| Max | 2.5 ms |

The median is 0.0 ms because most segments finished inside one `performance.now()` step on this Chromium. The p95 is 0.7 ms and the slowest segment in the stroke was 2.5 ms. A repeat of the same stroke under the same throttle landed at p95 0.40 ms and max 2.6 ms. That is the cost of one canvas line on this host, not handwriting latency on the NXTPAPER panel.
