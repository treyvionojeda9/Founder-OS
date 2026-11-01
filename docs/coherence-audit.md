# Stack coherence audit

Walked the stacked rooms (boot, hall doors, Work overview, desk drawer, pipeline, Team, Library, school path, Reading Room, mail tray, command ledger, deep links) at desktop 1440×900, tablet landscape 1280×800, and tablet portrait 800×1280, in normal colour, grayscale, and reduced motion.

Found **10** collisions. Fixed **10**. Nothing in this pass was left open.

## Defects

| # | Room | Viewport | Mode | What broke | Fix |
| --- | --- | --- | --- | --- | --- |
| 1 | Every room with the top bar | Desktop, tablet landscape, tablet portrait | Normal, reduced motion | Dimming the bar set the team name to `flex: none` inside a `space-between` row, so the label jumped from beside Back to the middle of the bar (about 500px on desktop). | The bar starts at the left and the side nav keeps `margin-left: auto`. The outlined name stays beside Back. Buttons do not move. |
| 2 | Overview, mail tray | All three | Normal, reduced motion | Escape closed the tray only while focus was inside it. After the ledger took focus, Escape closed the ledger and left the tray up. | While the tray is open, Escape on the window closes it, and yields when the ledger, an approval stamp, the board slip, or a native dialog is the top overlay. |
| 3 | Overview, drawer + tray | All three | Normal | The drawer listened for Escape in the capture phase. Opening the mail slot from the ledger (a click, not a pointer) left both open, and Escape closed the buried drawer first. | The drawer ignores Escape while the tray, ledger, approval stamp, board slip, or a dialog is open. |
| 4 | Ledger over the path book, and any ledger | All three | Normal, reduced motion | The path book is a native dialog (top layer). The ledger was only `z-index: 90`, so it painted underneath, and Tab left the modal. | The ledger is shown with `showModal`, so it stacks above the book. Escape is handled on capture and closes only the ledger. Tab cycles inside the sheet. |
| 5 | Overview, desk drawer | All three | Normal | Drawer rows rendered at 40px, under the 44px touch floor. | Row minimum height is 44px. |
| 6 | Overview, tile count | Desktop | Normal | The 2/3/4 radios were 40×40 inside a 48px label (4px border). Zooming the whole list to 0.9 for two tiles also shrank the lamp chain and the drawer pull under 44px. | The choice is 52px, so the radio's box is 44px. The two-tile zoom applies to the desk art only. |
| 7 | Overview, mail tray | Tablet landscape | Normal, reduced motion | The open tray extended to y=700 while the pipeline starts at y=678, so the hall clipped the bottom of the tray. | The slot's max height is the wainscot plus the floor. The tray scrolls inside that. Measured bottom is y=674, above the pipeline. |
| 8 | Overview, mail slot | Tablet landscape | Normal | The strip desk started at y=343 and covered the mail mouth (y=384). | The landscape strip stage is zoomed to 0.78. The lamp now sits beside the mouth instead of through it, and the pulls stay 48px. |
| 9 | Team | Tablet landscape | Normal | The board was taller than the room and `.study` hid the overflow, so the stapler could not be reached. | The board scene scrolls. The walk scrolls the stapler into view. |
| 10 | Overview, expanded sheet | All three | Normal | Opening a sheet left the desk drawer mounted underneath. | Covering the room closes the drawer. |

## Checked and already holding

- Document horizontal overflow was 0 on the walked rooms at all three sizes.
- Computed colours on the chrome, trays, drawers, ledger, pipeline, and plaques stay inside Founder Ember. School accent appears on the school hall, the path map, and the Reading Room.
- Reduced motion sets one frame (`data-frames="1"` on the hall, mail slot, pipeline, path map, and ledger). With motion allowed, the pipeline uses two place-frames and the mail slot uses four.
- The walk never approves a stamp and never writes `humanNotes` or `machineNotes`. No non-GET request left the page.
- The closed mail mouth on desktop and portrait still sits in the centre cubby. That placement was already correct and was not moved.

## Not removed

No earlier module was dead. The two-tile zoom on the whole desk list was the piece this pass replaced; it now zooms only the desk art.
