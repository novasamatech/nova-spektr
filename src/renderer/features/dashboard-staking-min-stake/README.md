# Staking Min Stake Card

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-25

## Overview

A KPI card on the Dashboard's **Staking** tab — the third of the row, in the slot "Nominated validators" used to hold —
that answers "how much backing does a validator need to be in the active set, and which way is that moving". One number
per era: the smallest **total backing** (own + nominator stake) among the validators the election actually seated. The
card carries the active era's threshold, its change against seven eras ago and a zoomed sparkline; clicking it opens a
drill-down with the full step line over a chosen range of eras, the same eras as a table, and a CSV export.

It is the entry threshold read from the era's exposures, **not** `minimumActiveStake` (a nominator-side metric). Two
audiences: an operator watching how safe their seat is, and a prospective validator sizing what it takes to get in.

The card is variant **1A** and the drill-down's plot variant **2C "era step line"** of the approved design exploration
(`Min Stake Widget Options.dc.html`); the range, axis, table and export controls of the drill-down follow the house
patterns of the rewards drill-down on the same tab.

## Who can use it / when it applies

- Gated by the **`dashboard`** feature flag, injected into the Staking tab's widget slot with the KPI card size, so it
  sits in the row with `dashboard-staking-kpi`'s three cards and can be dragged like them.
- **The only network-level card in the row**: the threshold is a fact about the chain, not about the wallet, so the card
  deliberately ignores the dashboard's account picker. An empty selection must not blank it — the three cards beside it
  go grey, this one keeps its data and stays clickable.
- The network is one of the Asset Hub chains configured in this build (staking lives on Asset Hub), never a hardcoded
  DOT/KSM pair. The card shows the network last picked in the drill-down, so the two never disagree; before any pick it
  is the first configured one.
- Fiat appears in one place only — the drill-down's hover card, when the global fiat display is on. Everything reads
  correctly with it off.

## States / scenarios

| State      | When it appears                                    | What the user sees                                           |
| ---------- | -------------------------------------------------- | ------------------------------------------------------------ |
| Loading    | The era reads are still answering                  | Title in place, value and subline shimmering                 |
| No data    | The reads answered and no era had exposure entries | A grey em dash over "Era history unavailable" — never a zero |
| Populated  | At least one era resolved                          | `1.26M DOT`, `+9.11% vs era 2,266`, the sparkline            |
| Single era | Only the active era resolved                       | The threshold with `era N · active` and no delta             |
| Drill-down | The card is clicked                                | The modal below                                              |

**The card abbreviates, the drill-down does not.** `1.26M DOT` on the card; `1,265,900 DOT` in the hover card, the table
and the file — a spreadsheet is where people do arithmetic.

### The drill-down

Three controls, one question each:

- **Network** — the configured Asset Hub chains; the pick is shared with the card.
- **Era range** — `7`, `14`, `30` eras or `Max`, counted in completed eras before the active one. Eras are the honest
  unit: a Polkadot era is a day, a Kusama era six hours, so a range in days would mean a different number of election
  rounds per chain. Every preset is clamped to what the chain still keeps (`staking.historyDepth`, 84 on Polkadot and
  Kusama, minus the active era) — a pick the chain cannot serve reads what it can rather than failing.
- **X axis** — `Eras` (era numbers, with the date underneath while the plot is sparse) or `Timeline` (dates, falling
  back to the era number where a date cannot be stated honestly — see below).

Under the controls: the headline (`1.26M DOT · era 2,273 · active`, the delta chip against the first era of the range,
elected validators per era), the step line, the axis note, then a table newest era first — era, date, exact threshold,
change vs the previous era (tokens and percent), elected validators — and a footer with the era count and **Export
CSV**. The file is `nova-spektr-staking-min-stake-<chain>-<n>-eras-<date>.csv`, one line per era oldest first, with
full-precision token amounts and a signed change column; the first era's change cell is empty rather than a zero.

**The plot adapts to the range.** Every era carries its own value label while there are twelve or fewer; dots go above
thirty; x labels are thinned so at most eight print, the active era always among them. A step per era, always — the
threshold is constant inside an era, so a curve through the points would draw a change that never happened.

**The axis is zoomed, and says so.** The live 7-era band is under 1% of the value — a zero-based axis would draw eight
identical steps. The floor sits at `min − 0.4·range`, the note under the plot states it ("axis floor … — zoomed, not
zero"), and a literally constant series still gets a visible band so the line sits mid-plot rather than on the axis.

**Era labels are real or absent.** Dates derive from the chain's era anchor; when the anchor is unavailable, or the
chain's eras are shorter than a day (several eras then share a date — in practice Kusama's 6h eras), the date is omitted
rather than estimated. The era _number_ is always shown.

**Hover** — the era's column tints and a card floats over the plot (no reflow) with the era, its date, the threshold in
full, fiat when enabled, the change against the previous era and the elected count. Hover state lives in the plot
subtree and is driven by one pointer-move handler mapped to a column, so moving across the eras re-renders the plot only
— not the headline, controls or table.

**The active era's threshold is honest data**: exposures are fixed at election, so the number can lead the card while
the era is still running.

Out of scope for now: keyboard access to the per-era hover card (the table carries the same numbers), and persisting the
range and axis picks across sessions.

## Lifecycle

The user opens the Staking tab. The card reads the chain's active era, then walks the last seven eras through a per-era
resource — sequentially, because a burst of parallel prefix reads of ~600 entries each is exactly what public RPC nodes
rate-limit. A closed era's threshold is immutable and cached for the session, so when the era advances only the new era
is actually fetched. Opening the drill-down reuses those eras; widening the range reads only the eras not yet held.
Switching the network repeats the walk for the other chain; everything else — hover, the table, the delta — is local.
The card never navigates anywhere.

Failures degrade quietly: an era whose read never answers is dropped from the series rather than drawn as zero, and a
chain with no readable history shows the no-data state. A window with such a hole is not trusted for the session — it
expires after a minute, so the next mount (tab switch, network toggle, re-opening the modal) fills the gap from the
per-era cache plus the one missing read.

## Related

- [`dashboard-staking-kpi`](../dashboard-staking-kpi/README.md) — the three cards beside this one; owner of the card
  shell (`KpiCard`, `KpiWidgetFrame`, `KPI_SIZE`) and the CSV file-name convention this card reuses.
- `pages/Dashboard` — hosts the staking widget slot; its legacy-order migration maps the retired
  `dashboard/staking-nominations` slot to this card.
- `domains/staking` — the `era-thresholds` module (min backing + validator count per era), the active era and the era
  anchor (`useEraAnchor`).
- `shared/ui-kit` — `SegmentedControl`, the three toggles of the drill-down, shared with the rewards chart.
- [`dashboard-staking-rewards-chart`](../dashboard-staking-rewards-chart/README.md) — the house pattern for a chart on
  this tab: fixed-box states, asset toggle, "era labels real or absent".
