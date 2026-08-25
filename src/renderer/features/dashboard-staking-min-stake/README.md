# Staking Min Stake Widget

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-25

## Overview

A half-width card on the Dashboard's **Staking** tab that answers "how much backing does a validator need to be in the
active set, and which way is that moving". One number per era — the smallest **total backing** (own + nominator stake)
among the validators the election actually seated — drawn as a step line over the past 7 completed eras plus the active
one, with the active era's threshold as the headline.

It is the entry threshold read from the era's exposures, **not** `minimumActiveStake` (a nominator-side metric). Two
audiences: an operator watching how safe their seat is, and a prospective validator sizing what it takes to get in.

Implements variant **2C "era step line"** of the approved design exploration (`Min Stake Widget Options.dc.html`).

## Who can use it / when it applies

- Gated by the **`dashboard`** feature flag, injected into the Staking tab's widget slot.
- **The first network-level card on the tab**: the threshold is a fact about the chain, not about the wallet, so the
  card deliberately ignores the dashboard's account picker. An empty selection must not blank it — every other card on
  the tab goes grey, this one keeps its data.
- The asset toggle is built from the Asset Hub chains configured in this build (staking lives on Asset Hub), never a
  hardcoded DOT/KSM pair. Unlike the rewards chart there is no position-based default either — consulting the selection
  to pick the opening chain would reintroduce the dependency the card exists without.
- Fiat appears in one place only — the hover card, when the global fiat display is on. The widget reads correctly with
  it off.

## States / scenarios

| State     | When it appears                                    | What the user sees                                          |
| --------- | -------------------------------------------------- | ----------------------------------------------------------- |
| Loading   | The era reads are still answering                  | Title and asset toggle live, headline and plot shimmering   |
| Empty     | The reads answered and no era had exposure entries | An em dash headline and a sentence — never a zero threshold |
| Populated | At least one era resolved                          | Headline, delta chip, step line, axis note                  |
| Hover     | Pointer over an era's column                       | The column tints, a card floats over the plot (no reflow)   |

**The axis is zoomed, and says so.** The live 7-era band is under 1% of the value — a zero-based axis would draw eight
identical steps. The floor sits at `min − 0.4·range`, the card's footer states it ("axis floor … — zoomed, not zero"),
and a literally constant series still gets a visible band so the line sits mid-plot rather than on the axis.

**A step per era, not a curve.** The threshold is constant inside an era; interpolating between points would draw a
change that never happened. Completed eras share one muted line, the active era's segment, dot and labels carry the
accent.

**The plot is hand-rolled SVG, not Recharts** — a deliberate divergence from the rewards chart beside it. The design
draws full-column plateaus with the dot and value label at the column's centre, which Recharts' `stepAfter`
interpolation cannot produce (its step turns at the data point), and the active era's segment is a second stroke laid
over the shared line. Eight points don't justify a charting runtime, and the KPI donut already documents Recharts'
hover-animation crash as a live hazard.

**The plot keeps a K-notation precision floor** (`1,150.0K` vs `1,156.2K`) — the one deliberate exception to the card
abbreviation rule, confirmed at design review: the house M-shorthand prints the same `1.15M` for all eight eras of a
flat week. The headline still abbreviates (`1.15M DOT`); the hover card prints full precision (`1,160,234 DOT`), which
is the drill-down half of the same rule.

**The delta chip compares the active era against the era seven eras back** — amber when the threshold rose (it costs
more to get in), green when it fell. The per-era change lives in the hover card instead of on the plot, so the plot
stays one number per era.

**Era labels are real or absent.** The x-axis dates and the hover card's date derive from the chain's era anchor; when
the anchor is unavailable, or the chain's eras are shorter than a day (several eras then share a date — in practice
Kusama's 6h eras), the label is omitted rather than estimated. The era _number_ is always shown.

**The active era's threshold is honest data**: exposures are fixed at election, so the number can lead the card while
the era is still running.

## Lifecycle

The user opens the Staking tab. The card reads the chain's active era, then walks the era window through a per-era
resource — sequentially, because eight parallel prefix reads of ~600 entries each is exactly the burst public RPC nodes
rate-limit. A closed era's threshold is immutable and cached for the session, so when the era advances only the new era
is actually fetched. Switching the asset repeats the walk for the other chain; everything else — hover, the delta — is
local. The card never navigates anywhere.

Failures degrade quietly: an era whose read never answers is dropped from the series rather than drawn as zero, and a
chain with no readable history shows the empty state. A window with such a hole is not trusted for the session — it
expires after a minute, so the next mount of the card (tab switch, asset toggle) fills the gap from the per-era cache
plus the one missing read.

Out of scope for now: keyboard access to the per-era hover card — the columns are pointer-only, as on the rewards chart.

## Related

- `pages/Dashboard` — hosts the staking widget slot.
- `domains/staking` — the `era-thresholds` module (min backing + validator count per era), the active era and the era
  anchor (`useEraAnchor`).
- `shared/ui-kit` — `SegmentedControl`, the asset toggle shared with the rewards chart.
- [`dashboard-staking-rewards-chart`](../dashboard-staking-rewards-chart/README.md) — the house pattern for a chart card
  on this tab: fixed-box states, asset toggle, "era labels real or absent".
