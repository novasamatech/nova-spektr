# Price Tracker

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-19

## Overview

A row of small price tiles on the Dashboard's **Overview** tab — one per token the user chose to watch — each showing
the current price and its 24-hour change, and each opening a price-history chart when clicked.

It is the one widget on the dashboard that is **not** about the user's own money. Every other card answers "what do I
hold"; this one answers "what is the market doing", which is the question people leave the app for. The list is
therefore the user's own: it is not derived from what they hold, and holding nothing does not empty it.

## Who can use it / when it applies

- Gated by the **`dashboard`** feature flag, and by the global **show fiat** toggle — a price tracker with prices turned
  off has nothing to show.
- Independent of the dashboard's account picker: prices do not depend on whose accounts are selected.
- The choosable tokens are every asset across all configured chains that has a price feed, deduplicated by feed and
  sorted by symbol — so one token appears once even when it lives on several chains.

## States / scenarios

| State           | When it appears                      | What the user sees                                   |
| --------------- | ------------------------------------ | ---------------------------------------------------- |
| Hidden          | `dashboard` flag off, or fiat off    | No card                                              |
| Empty list      | The user untracked every token       | "No tokens tracked. Click + to add tokens."          |
| Loading         | Prices not fetched yet               | Tiles in place, price and change shimmering          |
| Populated       | Prices available                     | Price and 24h change per tile, coloured by direction |
| Price missing   | The feed has no entry for that token | That one tile stays blank; the others are unaffected |
| Chart open      | A tile is clicked                    | History modal for that token                         |
| Token selection | The settings icon is clicked         | A searchable checklist of every priced asset         |

## The watch list

Two tokens — **Polkadot and Kusama** — are tracked by default, and the list is **persisted and shared across windows**,
so it survives a restart and does not have to be rebuilt per session.

The list is stored as price-feed ids rather than as assets. A feed id is what the price service is keyed by and is
stable across the chains an asset appears on, so a stored entry keeps working when chain configuration changes; a stored
id nothing currently offers is simply skipped rather than rendering a dead tile.

Tiles keep the order the user added them in, not an order derived from price or change — a watch list that reshuffled
itself as the market moved would lose the position the user learned to look at. Each tile's accent colour is derived
from its token, so the same token keeps its colour here and in the dashboard's other charts.

## The history chart

The modal charts the token's price over **24 hours, 7, 30 or 90 days**, defaulting to 7 days, and reports the change
over the range shown next to the current price — the change over the window on screen, not the fixed 24-hour figure the
tile shows, which is what makes switching ranges informative.

**A slow fetch is not an error, and is not treated as one.** The chart shimmers while the request is out and only offers
a Retry after it has been waiting long enough that something is plainly wrong; a retry button that appears immediately
invites the user to hammer a request that was merely slow. Switching range re-fetches for the new window.

## Related

- **Price domain** (`domains/price`) — current prices and the price-history resource behind the chart.
- **currency-select aggregate** — the display currency and the show-fiat toggle both widgets and tiles honour.
