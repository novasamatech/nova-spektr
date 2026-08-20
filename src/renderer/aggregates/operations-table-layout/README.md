# Operations table layout (aggregate)

> Part of the [Feature Map](../../features/README.md) — Last reviewed: 2026-08-20

User preference for the Multisig Operations table: the widths of the four resizable columns (Operation, Value,
Submitter, Initiator) and the transient "a column is being dragged" flag. Shared by the operations rows, the drafts rows
and the sticky column header so all three grids stay aligned.

## Behaviour

- Defaults 240 / 140 / 180 / 180 px; each column is clamped to its own min/max (180–440, 120–300, 140–440, 140–440) and
  has an autofit width (268 / 164 / 304 / 304) applied on double-click.
- Initiator only renders at ≥1536px; `useIsInitiatorColumnVisible` mirrors that breakpoint so the list's computed min
  width includes the column exactly when CSS shows it.
- Widths persist per user in local storage (`operations-table-column-widths`) and sync across windows; a stored value
  from an older build or a hand-edited one is merged over the defaults and clamped to each column's range.
- `$resizingColumn` is set for the duration of a drag so every row can show its column hairlines, not just the hovered
  one.

## Used by

- [`multisig-operations`](../../features/multisig-operations/README.md) — header handles, row cell widths.
- [`drafts`](../../features/drafts/README.md) — draft row cell widths.
