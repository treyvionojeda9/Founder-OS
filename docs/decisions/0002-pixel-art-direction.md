# 0002 — Pixel art direction

## Status

Accepted. The eight-colour Founder Ember palette was approved on 28 Oct 2026.

## Context

The shell should feel like a quiet study hall: lamp light, wood, paper, and a flame of freedom. The splash mark is the Sovereign Monastery flame only — the almond with a hollow centre — pixelized into Founder Ember. No diamond frame, no torch stand, and no Monastery wordmark. The shell wordmark stays "Spark of Freedom".

The reference sheets are low-resolution pixel art: full-body figures, flat shading, and a short vertical swatch column. Outlines are a darker tone of the local colour.

## Decision

- Sprites are palette-indexed string grids in `client/src/design/sprites`, drawn at an integer scale of ×4 to ×8 with `image-rendering: pixelated`.
- Founder Ember (`night`, `slate`, `paper`, `wood`, `darkwood`, `ember`, `flame`, `plum`) is the only UI palette, plus the school accent set for curriculum marks. Both live in `client/src/design/palette.ts`.
- Each scene stays near eight colours. Shading is one base tone plus one or two darker tones.
- The Spark of Freedom mark is that pixelized flame, used on the splash, the home header, and the desktop rail.
- Splash auto-continue is one beat. A door click is three beats and nothing loops: the leaf swings open, the doorway comes forward until its light fills the view, then the route rises out of that light. `prefers-reduced-motion` skips the motion and goes straight to the next page.
- Headings and body use the OFL Press Start 2P font, bundled under `client/src/fonts` with its license. The type scale in `client/src/design/type.ts` is four integer steps of the 8px bitmap cell: meta 8, body 16, title 24, display 32. Chrome, chips, stamps, and dense sheet copy use meta. Legends and short prose use body. Scene headings use title. The splash wordmark uses display. Sans and pixel do not share a row.
- Every state has to stay readable in grayscale. Lamp on, off, and failed differ in shape, which the grayscale grid test locks in.

## Consequences

- Swapping the palette means editing `palette.ts` only.
- Real-device crispness and the font's on-device hinting still need a look on the TCL Note A1.
- Work chrome is a darkwood pixel bar. The active control is ember. Hover and press use flame, wood, plum, and night from Founder Ember. Status chips for working, idle, and failed use ember, slate, and plum. Failed is not black on white.
