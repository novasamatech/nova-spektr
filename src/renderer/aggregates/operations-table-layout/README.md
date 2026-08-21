# Operations table layout (aggregate)

> Part of the [Feature Map](../../features/README.md) — Last reviewed: 2026-08-21

User preference for the Multisig Operations table: the widths of the six resizable columns (Operation, Value, Submitter,
Initiator, Signed/Status, Actions), which columns are shown at all, and the transient "a column is being dragged" flag.
Shared by the operations rows, the drafts rows and the sticky column header so all three grids stay aligned.

## Behaviour

- Defaults 240 / 140 / 180 / 180 / 110 / 168 px; each column is clamped to its own min/max (180–440, 120–300, 140–440,
  140–440, 90–220, 120–320) and has an autofit width (268 / 164 / 304 / 304 / 110 / 168) applied on double-click.
- `$visibilityOverrides` holds only the columns the user decided about (`operations-table-column-visibility`);
  `useOperationColumnVisibility` lays them over the defaults. Everything is on by default except Initiator, whose
  default follows the ≥1536px breakpoint (`useIsInitiatorColumnVisible`) — once the user picks, the choice sticks at
  every window size. Hidden columns drop out of the list's computed min width.
- `layoutReset` ("Reset to defaults" in the header's settings menu) clears the overrides and returns every width to its
  default.
- Widths persist per user in local storage (`operations-table-column-widths`) and sync across windows; a stored value
  from an older build or a hand-edited one is merged over the defaults and clamped to each column's range.
- `$resizingColumn` is set for the duration of a drag so the list can suspend text selection while the pointer moves.

## Used by

- [`multisig-operations`](../../features/multisig-operations/README.md) — header handles, row cell widths.
- [`drafts`](../../features/drafts/README.md) — draft row cell widths.
