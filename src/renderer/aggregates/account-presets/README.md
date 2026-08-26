# Account presets

> Part of the [Feature Map](../../features/README.md) — Last reviewed: 2026-08-19

## Overview

Named, reusable account selections for the Dashboard and Operations pages. Instead of picking accounts one by one every
time, the user saves a preset once and switches between presets with one click. A preset either captures an explicit
list of accounts ("Custom Selection") or a set of filter criteria ("Smart Filter") that is re-evaluated against the
current account list, so new accounts matching the criteria join the preset automatically.

## Who can use it / when it applies

Always available on the Dashboard and Operations pages. The account pool a preset draws from merges three sources, one
row per `accountId`: wallet accounts, local (My) contacts, and backend (External) contacts from the external address
book. Filter criteria based on address-book metadata only ever match accounts known to the external address book.

## States / scenarios

| State                 | When it appears                      | What the user sees                                                                                              |
| --------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| No presets            | Fresh install / all presets deleted  | Only the "All" tab plus a settings button that opens the management modal                                       |
| Preset segments       | 1–3 presets exist                    | Up to 3 preset tabs next to "All", each with a matched-account counter and a source-breakdown tooltip           |
| Overflow              | More than 3 presets                  | The first 3 presets stay as tabs; the rest live in a searchable popover with a "Manage Presets" entry           |
| Active preset         | User activates a preset on a surface | That surface (Dashboard or Operations — tracked independently) scopes its data to the preset's matched accounts |
| Deleted active preset | The active preset is deleted         | The surface falls back to "All"                                                                                 |

### Preset types

- **Custom Selection** — a fixed, hand-picked set of accounts (`selectedIds`).
- **Smart Filter** — criteria evaluated live against the merged account list:
  - **Source Type** — wallet / My Contacts / External Source (OR within the list).
  - **Network** — multi-select over chains present on external contacts, keyed by `chainId` (stable across backend
    renames); the chain's display name is shown.
  - **Address-book fields** — one multi-select per admin-defined field found on the synced external contacts (e.g.
    Entity, Category, Contact Type — but the set is fully dynamic). A field appears in the editor as soon as some
    contact carries a value for it and disappears when none does. Matching is keyed by the backend's stable field and
    option ids, so admins renaming a field or option does not break saved presets; the criterion also stores
    display-label snapshots. A saved criterion whose field/option no longer exists in the address book is still shown
    (marked "removed") so it can be inspected and cleared — while present, it matches nothing.
  - Criteria groups combine with AND; within one field's selected options — OR. Any address-book-derived criterion
    (everything except Source Type) restricts matches to accounts present in the external address book.

### Deleting a preset

Deletion is available only inside the management modal: hovering a preset in the left-rail list reveals a trash icon on
that row. Clicking it always asks for confirmation — a warning dialog names the preset ("Are you sure you want to delete
…?") with Cancel / Delete actions. On confirm the preset is removed and a toast confirms it; if the deleted preset was
open in the editor, the editor moves to the neighbouring preset (or resets to the empty "New Preset" form when none
remain), otherwise the current selection stays put.

## Lifecycle

1. User opens Manage Presets (settings button or overflow popover) → modal with a reorderable (drag-and-drop) preset
   list on the left and the editor on the right.
2. Create: "New Preset" → choose type, name (≤30 chars), criteria or explicit selection; a live preview shows the
   matching accounts and a source breakdown. Save adds the preset and a toast confirms.
3. Edit: select a preset, adjust, Save. Switching type keeps only the active type's data on save.
4. Activate: click a preset tab (or overflow item) on a surface; the choice persists per surface across restarts.
5. Delete: see "Deleting a preset" above.

Presets and per-surface activation are stored locally (localStorage) and sync across windows. Presets saved by older app
versions are normalized once at startup and persisted in the current shape: missing criteria fields are treated as
empty, and criteria saved by retired schema versions (name-keyed Entity/Category/Contact Type/tag lists) are dropped. A
Smart Filter that loses every criterion this way is flagged as needing review: it matches no accounts (never silently
"all"), the surface tab tooltip / overflow row and the editor show a "filters no longer supported" notice, and the flag
clears once the user saves new filters. Presets that also carried current criteria keep those and are applied as usual.

## Related

- Rendered by `widgets/PresetManagementModal` (editor modal) and `features/account-selector` (surface switcher tabs).
- Backend contact metadata (chain + admin-defined fields) comes from the external address book backend
  (`domains/backend/contacts`); the field set is dynamic — admins create, rename and delete fields at runtime, and the
  filter UI reflects whatever the backend exposes.
- Display names follow the app-wide resolution order: for indexed wallets (multisig/proxied) the address-book name wins
  over the auto-generated wallet name; otherwise the user's wallet account name wins.
