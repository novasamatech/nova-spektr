# Dashboard Widget Layout

> Scope: this spec covers the **widget layout & edit experience** of the dashboard — how widgets are placed, arranged,
> resized, and persisted. It does not cover the individual widgets' own behaviour (portfolio, staking, governance,
> operations queue), the account-preset selection, or the tab structure beyond how they relate to layout.

## Overview

Each dashboard tab (Overview, Staking, Governance) shows a set of widgets on a **4-column grid**. In **edit mode** the
user can drag widgets to new positions and resize them on both axes; the layout is a **free 2D mesh** — a widget keeps
the column it is placed in — kept tidy by **vertical compaction** (widgets float up so there are never vertical gaps).
Each tab's arrangement is saved per browser and restored on the next visit. In edit mode a widget can also be **hidden**
(the eye button on its card); hidden widgets are restored from the **"Add widget"** popover in the header and re-enter
the grid at the bottom at their default size.

Widgets declare a **default size**, a **minimum size** and optionally a **maximum size**; the grid uses these to place
new widgets and to bound resizing. A maximum is declared by widgets whose content cannot use extra space (e.g. the
staking KPI cards); widgets without one stretch freely. Size is owned by the layout, not by the widget — the same widget
can be made larger or smaller by the user, and the widget's content stretches to fill the assigned rectangle.

## Who / when

- Anyone using the dashboard. Layout is read-only until **edit mode** is toggled from the dashboard header (the pencil
  button).
- Editing affordances (drag handle, resize handle, reset) appear **only in edit mode**; outside it the grid is static.
- Requires at least one selected account for widgets to render (otherwise the tab shows its empty state).

## Model

A widget occupies a rectangle `{ x, y, w, h }` in grid units:

- `x` / `w` — column (0–3) and column span (1–4); `x + w` never exceeds 4.
- `y` / `h` — row and row span; each row is a fixed height. Content taller than the assigned height **scrolls inside**
  the widget — vertically only, never sideways. A widget whose content is sized from the cell rather than from the
  content itself (a chart filling its box) opts out of scrolling entirely and stretches into whatever height it is
  given.

Layout is stored per tab, per widget. Drag and resize update the moved/resized widget, then **collisions are resolved**
(overlapped widgets are pushed down) and the whole tab is **vertically compacted**.

## States / scenarios

```mermaid
flowchart TD
    OPEN["Open a dashboard tab"] --> HAS{"Saved layout for this tab?"}
    HAS -- "yes" --> RECON["Reconcile: keep saved rects,<br/>add any new widgets, drop removed/hidden ones"]
    HAS -- "no" --> SEED{"Legacy 1D order saved?"}
    SEED -- "yes" --> MIG["Seed layout from the old order<br/>(reproduces prior arrangement)"]
    SEED -- "no" --> DEF["Seed from each widget's default size"]
    RECON --> SHOW["Render the 2D grid"]
    MIG --> SHOW
    DEF --> SHOW
    SHOW --> EDIT{"Edit mode?"}
    EDIT -- "no" --> STATIC["Static grid"]
    EDIT -- "yes" --> TOOLS["Drag handle + resize handle + Reset layout"]
```

| Action                 | Trigger                                                   | Result                                                                                                                                                            |
| ---------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Move**               | Drag a widget (by its handle) onto another's cell         | The widget adopts that position (clamped to the grid); others are pushed down and the tab compacts upward                                                         |
| **Resize**             | Drag the bottom-right handle                              | The widget grows/shrinks in column + row units, clamped to its minimum size, its maximum size (if declared) and the grid edge; the change commits once on release |
| **Reset**              | "Reset layout" button (edit mode)                         | The active tab returns to every widget's default size and position; the tab's hidden widgets are all restored                                                     |
| **Hide**               | Eye button on a widget card (edit mode)                   | The widget disappears from the grid; its rect is dropped and the tab compacts up. The hidden set persists per tab                                                 |
| **Restore**            | "Add widget" popover in the header (edit mode)            | The widget re-enters at the bottom of the tab at its default size — same path as "New widget appears"                                                             |
| **New widget appears** | A widget becomes available (e.g. a feature flag turns on) | It is placed at the bottom of the tab; existing widgets keep their positions                                                                                      |
| **Widget removed**     | A widget becomes unavailable                              | Its rect is dropped; remaining widgets compact up                                                                                                                 |

The "Add widget" button is disabled when the tab has nothing to restore. Both it and the empty-grid hint only count a
hidden widget as restorable while its underlying feature is still available (e.g. a hidden widget behind a feature flag
that later turned off doesn't count).

## Lifecycle

1. On opening a tab, the saved layout (if any) is **reconciled** against the widgets currently available: known widgets
   keep their rects (clamped to the widget's current maximum size, so a layout saved before a cap was declared shrinks
   to fit), newly-available widgets are placed, and rects for widgets that disappeared **or are hidden** are removed — a
   restored widget re-enters through the same "newly-available" path, at the bottom, rather than its old spot.
2. First-time users (or a tab never arranged) are **migrated** from the old 1D widget order if present, otherwise seeded
   from default sizes — in both cases laid out left-to-right then compacted, matching the previous look.
3. Edits (move, resize, hide, restore, reset) update the stored layout and hidden set, which **persist locally**
   (`dashboard-widget-layout-v1`, `dashboard-hidden-widgets-v1`) and sync across windows.

## Related

- **Widget injection** — each widget is injected into a tab's slot and declares its `defaultSize` / `minSize` /
  `maxSize` there; the grid reads these to size and place it. It also declares a `label` — the i18n key of the widget's
  card title — used by the "Add widget" popover to name hidden widgets.
- **Account presets / selection** — drive which accounts the widgets show; unrelated to placement, but a tab with no
  selected accounts renders its empty state instead of the grid.
