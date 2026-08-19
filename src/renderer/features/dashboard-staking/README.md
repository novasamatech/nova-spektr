# Dashboard Staking Summary

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-19

## Overview

One small card on the Dashboard's **Overview** tab that answers "am I staking, and roughly how much" without leaving the
tab someone opened to see everything at once. Three figures on a single line — average APY, how many of the selected
accounts stake at all, and the fiat total — and nothing to click.

It is deliberately shallow. The Overview tab is a scan surface: a user who wants the real answer has the **Staking** tab
next door, where [`dashboard-staking-kpi`](../dashboard-staking-kpi/README.md),
[`dashboard-staking-positions`](../dashboard-staking-positions/README.md) and
[`dashboard-staking-rewards-chart`](../dashboard-staking-rewards-chart/README.md) break the same money down per
position, per validator and per month.

**This module used to be the Staking tab as well.** The three widgets that served it — staking overview, total rewards,
monthly rewards — and their detail modals are still in the folder, marked `@deprecated`, injected nowhere, and kept only
as the reference for behaviour the rework has not reproduced yet (per-chain allocation, the nominated-validator list).
They ship no UI. When that debt is settled they go.

## Who can use it / when it applies

- Gated by the **`dashboard`** feature flag, and by the global **show fiat** toggle: with fiat off the card renders
  nothing at all, because every figure it has to offer is either a fiat total or an average that only makes sense next
  to one.
- Follows the dashboard's account picker, like every other widget on the tab.
- Reads **Polkadot Asset Hub and Kusama Asset Hub only** — the two chains the app supports staking on. A position on any
  other chain is not counted here.
- A chain contributes only when its staking asset has a price feed. Without one there is no fiat value to add, and the
  card has no token-amount fallback to fall back on.

## States / scenarios

| State        | When it appears                                    | What the user sees                                                    |
| ------------ | -------------------------------------------------- | --------------------------------------------------------------------- |
| Hidden       | `dashboard` flag off, or fiat display off          | No card                                                               |
| No selection | The dashboard account picker is empty              | Title + "No accounts selected"                                        |
| Loading      | Ledgers or APYs still resolving, nothing known yet | Title, three shimmering bars                                          |
| No staking   | Resolved, and none of the selected accounts stakes | "No active staking positions"                                         |
| Populated    | At least one selected account has a bonded ledger  | Average APY · staking accounts · total staked                         |
| Partial      | Ledgers known, prices or APY still arriving        | The figures already known, a shimmer in place of the ones that aren't |

An empty selection and an empty result are kept apart, as they are on every other widget of the tab: with nothing
selected there is no selection whose positions could be missing, and answering that with "No active staking positions"
would let two widgets side by side describe the same empty state as if one of them had found something.

## What the three figures mean

- **Average APY** — the plain mean of the network APYs of the chains the selection stakes on, not a stake-weighted
  blend. On this card it is a rough "what does staking pay right now" rather than "what does _your_ stake earn": with at
  most two chains in play the two rarely diverge much, and the Staking tab's Est. APY card is the weighted answer for
  anyone who needs it.
- **Staking accounts** — how many distinct selected accounts hold a non-empty ledger, counted across both chains, so an
  account staking on Polkadot and Kusama counts once. It answers "how much of my wallet is at work", which is a question
  about accounts, not about positions.
- **Total staked** — the fiat sum of everything bonded, unbonding included. Money mid-unbond is still staked; it just
  cannot be moved yet.

## Related

- [`dashboard-staking-kpi`](../dashboard-staking-kpi/README.md),
  [`dashboard-staking-positions`](../dashboard-staking-positions/README.md),
  [`dashboard-staking-rewards-chart`](../dashboard-staking-rewards-chart/README.md) — the Staking tab this card links
  the Overview tab to conceptually, and which replaced this module's own tab widgets.
- [`staking-positions`](../../aggregates/staking-positions/README.md) — the aggregate the rework reads. This card
  predates it and still assembles its own figures from the staking domain hooks; unifying the two is the natural next
  step once the deprecated set is deleted.
