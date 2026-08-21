# Operations table layout (aggregate)

> Part of the [Feature Map](../../features/README.md) — Last reviewed: 2026-08-21

## Overview

User preference for the Multisig Operations table: the widths of the six resizable columns (Operation, Value, Submitter,
Initiator, Signed/Status, Actions), which columns are shown at all, and the transient "a column is being dragged" flag.
Shared by the operations rows, the drafts rows and the sticky column header so all three grids stay aligned; the row and
cell scaffolding (row height, cell classes, the left Operation+Value block) lives here too so the three cannot drift.

## Behaviour

- Every column has a default width, a min/max range it is clamped to, and an autofit width applied on double-click; the
  numbers are the named `COLUMN_*_WIDTHS` constants next to the code, not restated here.
- Visibility keeps only the columns the user decided about and lays them over the defaults. Everything is on by default
  except Initiator, whose default follows the ≥1536px breakpoint — once the user picks, the choice sticks at every
  window size. Hidden columns drop out of the list's computed min width.
- "Reset to defaults" in the header's settings menu clears the visibility decisions and returns every width to its
  default.
- Widths and visibility persist per user and sync across windows; a stored value from an older build or a hand-edited
  one is merged over the defaults and clamped to each column's range, and an unreadable one is ignored. Width writes are
  coalesced during a drag so a pointer move does not hit storage on every pixel.
- The drag flag is on for the duration of a header-handle drag so the list can suspend text selection while the pointer
  moves.
- Hovering a cell highlights its whole column — every operation and draft row plus the header caption — so a value can
  be read down the table without losing the column. Operation and Value count as one column with the left block; the
  highlight clears over row gaps, headings and when the pointer leaves the list. It is a browser-only repaint: no row
  re-renders, no state.

## Used by

- [`multisig-operations`](../../features/multisig-operations/README.md) — header handles, row cell widths.
- [`drafts`](../../features/drafts/README.md) — draft row cell widths.
