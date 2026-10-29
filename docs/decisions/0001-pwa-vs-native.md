# 0001 — PWA prototype instead of a native Android client

## Status

Accepted for the Milestone 1 prototype.

## Context

White Paper Chapter 2 says a native Android client is the stronger fit for a premium pen tablet. The TCL Note A1's stylus, palm rejection, and NXTPAPER display are outside what a browser can fully control.

## Decision

Milestone 1 ships as a PWA: Vite, React, and Dexie in the browser. Capture, the last-open hall, and local search stay on the device and do not wait for a server. The native client remains the later pen path. This prototype has to be tried on the TCL Note A1 itself before the pen interaction is treated as done.

## Consequences

- Pen pressure, tilt, and hover may differ from a native ink surface. `p` stays optional so a stroke is valid without them.
- The shell is exercised at 1000×1600 and 1600×1000, DPR 2, plus a 1440×900 desktop layout.
- A device pass is still required. Automated viewports do not prove palm rejection or sunlight readability.
