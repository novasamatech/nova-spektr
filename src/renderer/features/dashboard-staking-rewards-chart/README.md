# Staking Rewards Chart

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-11-05

## Overview

A full-width card on the Dashboard's **Staking** tab that answers "how much have I earned from staking, and when". One
asset at a time, one period at a time: a bar per day, week or month over the chosen window, a headline total above it,
and a hover card that breaks any single bar down by the account that earned it.

The card replaces the old fixed "12-Month Rewards" widget. Where that one could only show twelve monthly bars, this one
lets the user choose the window (`7d` / `30d` / `90d` / `1y`) and re-buckets the same year of history to match, so a
recent payout is visible as a day rather than being averaged into a month.

## Who can use it / when it applies

- Gated by the **`dashboard`** feature flag, and lives in the Staking tab's widget slot.
- Needs accounts selected in the dashboard's account picker. With an empty selection there is nothing to query and the
  card shows its empty state.
- **Staking lives on Asset Hub**, so the asset toggle is built from the Asset Hub chains actually present in the network
  configuration — not from a fixed DOT/KSM pair. A chain that is not configured in this build has no toggle option at
  all, and a build with none of them renders no card.
- Reward history comes from the SubQuery indexers declared on the chain. Asset Hub's own history is merged with the
  relay chain's, so rewards earned before staking migrated to Asset Hub are still counted.
- Fiat is secondary: with the global "show fiat" toggle off, the card keeps working and simply prints token amounts with
  no converted value.
- Like every widget on the grid it can be **hidden** in edit mode and brought back from the header's **"Add widget"**
  menu — see the [Dashboard spec](../../pages/Dashboard/README.md). It is listed there as **"Rewards chart"** rather
  than by its card title "Rewards", so the restore menu cannot confuse it with the rewards KPI card.

## States / scenarios

| State       | When it appears                                      | What the user sees                                                                                                                                                      |
| ----------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading     | Reward history for the selection is in flight        | Header and controls, with a shimmer occupying exactly the plot's box                                                                                                    |
| Empty       | Every indexer answered, nothing earned in the window | Header and controls, and "No rewards yet — start staking to see your…"                                                                                                  |
| Chart       | At least one bar in the window is non-zero           | Total line, bars, gridlines, x labels                                                                                                                                   |
| Incomplete  | An indexer of the asset's history did not answer     | The bars and total that did load, with "incomplete — some history couldn't be loaded" on the total line; with no bar at all, "Reward history is incomplete" in the plot |
| Unavailable | No indexer of the asset's history answered           | "Couldn't load" in place of the total and "Couldn't load reward history" in the plot — never `0 DOT`, never "No rewards yet"                                            |
| Bar hover   | Pointer over a bar                                   | A floating card: bucket title, per-account rows, a Total footer with fiat                                                                                               |
| Fiat off    | Global "show fiat" toggle is off                     | The same card without the "≈ …" part of the total line                                                                                                                  |

The loading shimmer, the empty message and the plot all occupy the same box, so data arriving — or the user switching
range or asset — never moves anything below the card. That box is whatever height the widget's cell leaves over: the
card never scrolls, the plot stretches into the space instead, and resizing the widget resizes the plot.

Because nothing scrolls, everything has to fit the cell at every size the widget allows:

- The header **wraps** rather than overflows — narrow the widget and the range switch drops onto its own line instead of
  sliding out of reach.
- The hover card is **bounded by the plot**. It lists every contributing account, largest first, and states how many
  there are ("12 accounts") next to the bucket title — so a list the card had to cut short is never mistaken for the
  whole of it. The title and the Total line never give way; the account rows do.

### Ranges and bucketing

The range chips do not change what is fetched, only how it is cut: one year of raw payout records is fetched once per
asset and re-bucketed locally, so switching chips is instant.

| Range | Bars | Bar covers       |
| ----- | ---- | ---------------- |
| `7d`  | 7    | a calendar day   |
| `30d` | 30   | a calendar day   |
| `90d` | 13   | a calendar week  |
| `1y`  | 12   | a calendar month |

`30d` is the default. The counts are chosen so bars stay wide enough to point at — ninety days is thirteen weeks rather
than ninety slivers. Buckets are calendar-aligned and contiguous, the newest one being the (partly elapsed) day, week or
month that contains now; a bucket with no payout is drawn as an empty slot rather than skipped, because "nothing that
month" is information.

**Every bar carries its value label, on every range.** The hover card holds the per-account breakdown, never the only
copy of the number: reading what a bar is worth must not require pointing at it. Labels used to be suppressed past 13
bars, which hid them on exactly one range — `30d`, the default — so the figures appeared and vanished with the pointer.
The label is the shortened form (`13.56M`), including its suffix; the card is where the exact amount lives.

X labels are dated (`Jul 22`) for day and week bars. Month bars carry only the month name, with the **year** added under
the first bar and under every January, so a window that crosses new year stays unambiguous without repeating the year
twelve times.

### The hover card

Titled by the bucket — `Jul 18`, `Week of Jul 20`, `July 2026` — then one row per account that earned in it (identicon,
resolved name, network, amount), largest first, and a **Total** row with the asset's colour swatch and the fiat value.
Account names go through the app's standard resolution chain, so the name here is the name shown everywhere else. The
card is centred on its bar and pulled back inside the card's edges, so the first and last bars do not push it off.

**The era in a title is real or absent.** A day's title carries the era that was active that day, derived from the
chain's era anchor (the moment a known era started, plus the era's length) — never estimated. It is omitted whenever it
cannot be stated honestly:

- **week and month buckets** — they span dozens of eras, so no single number describes them;
- **chains whose era is shorter than a day** — a day then covers several eras, and picking one would be arbitrary (in
  practice this means Kusama, whose eras are six hours, shows no era while Polkadot's 24h eras do);
- **when the anchor is unavailable** — the era timeline is read from the relay chain, so before it connects there is
  nothing to derive from.

Where an era is shown, it is the era active at the **middle** of the day: era boundaries do not align with midnight, so
a day can touch two eras and the label names the one that covers most of it.

## Lifecycle

The user opens the Staking tab with accounts selected. The card picks the asset the wallet actually stakes on (falling
back to the first configured one), fetches a year of reward records for the selected accounts on that chain, and renders
the last 30 days. From there everything is local: switching asset refetches for the other chain, switching range
re-buckets what is already loaded, and hovering opens the breakdown. The card never navigates anywhere.

A failure is said, not absorbed. The history is merged from several indexers — the relay chain's for the time before
staking moved to Asset Hub, Asset Hub's for the time after — and each is read on its own. One that does not answer
contributes no records, and the card then marks what it shows as **incomplete**: the bars and the total that did load
are real, but they are a lower bound, and the total line says so. When none of them answers there is nothing to draw and
nothing to total, so the card says the history **couldn't be loaded** rather than printing `0` or "No rewards yet" —
both would claim the selection earned nothing. "No rewards yet" is shown only when every indexer answered. An indexer
counts as answering in full only when it paged through every payout of the year (a stash paid daily has far more rows
than one page), its row count did not move under the scan, and it has processed its chain up to the head; a payout two
indexers both hold is drawn once, and one they disagree about is left out and the history marked incomplete. A history
that is not complete is kept for 30 seconds instead of ten minutes: the card is re-requested on the next visit after
that.

## Related

- `pages/Dashboard` — hosts the staking widget slot and owns the account selection.
- `domains/staking` — the reward history (SubQuery, with Asset Hub → relay merging) and the era anchor (`useEraAnchor`).
- `shared/ui-kit` — `SegmentedControl`, the asset and range toggles, shared with the min stake card.
- `aggregates/staking-positions` — which chains the selection actually stakes on, used to pick the opening asset.
- `features/dashboard-portfolio-overview` — the house pattern this card follows for a dashboard card.
