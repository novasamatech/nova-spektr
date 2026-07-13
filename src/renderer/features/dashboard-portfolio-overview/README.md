# Portfolio Overview

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-07-13

## Overview

The first card of the Dashboard's **Overview** tab. It answers "what am I worth, in what, and in what shape" for the
currently selected accounts: one fiat total, a **distribution by balance type** (Transferable / Locked / Reserved /
Vested), and a donut plus list of holdings that flips between **By Asset** and **By Chain**, each row opening a
breakdown modal.

Everything is fiat-first — the card exists to answer the value question, so an asset with no price feed simply does not
appear in it.

## Who can use it / when it applies

- Gated by the **`dashboard`** feature flag.
- Rendered **only while fiat display is enabled** (the global "show fiat" toggle). With fiat off, the card is not dimmed
  or blurred — it is absent entirely.
- Needs at least one account selected in the dashboard's account picker; with an empty selection the card renders its
  own "No accounts selected" state.
- Only balances whose asset has a price feed in the active currency are counted, in the total, the bars, the donut and
  the lists alike. Unpriced assets are invisible here (the Assets page remains the complete view).
- The card is what drives balance subscriptions for the selection: wallet accounts directly, and contact addresses
  paired with every chain whose address scheme matches the key — so a substrate key is never queried on an EVM chain.

The card sits in the dashboard widget slot at the default first position, but users can drag-reorder widgets in edit
mode, so its position is a default rather than a guarantee.

## States / scenarios

| State                | When it appears                                | What the user sees                                                            |
| -------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| Hidden               | Fiat display off, or `dashboard` flag off      | No card at all                                                                |
| No selection         | No accounts selected                           | Title + "Select accounts above to view your balance"                          |
| Loading              | Prices/currency not resolved yet               | Skeleton in place of the total                                                |
| Zero balance         | Selection has a resolved total of exactly zero | The total ($0.00) renders, but **no distribution bars** and no holdings block |
| Priced holdings      | The current view's list is non-empty           | Total, distribution bars, donut and holdings list                             |
| No priced assets     | Balances exist but none carry a price feed     | Total (and bars, if any) with nothing below the divider                       |
| Asset / chain detail | A holdings row is clicked                      | Modal with a per-account (asset view) or per-asset (chain view) breakdown     |

The card has **no error state**: missing prices degrade into the loading/empty states above. The injected vesting
callout brings its own error boundary precisely because this slot offers none.

### Distribution by balance type

Four independent bars (not one stacked bar), each labelled with its own percentage to one decimal:

- **Transferable** — the spendable part of `free` after frozen/reserved are taken into account.
- **Reserved** — the account's reserved balance.
- **Locked** — a **residual**, `free − transferable`, not a direct on-chain read.
- **Vested** — the `VESTING` balance lock, **carved out of Locked rather than added beside it**.

Vesting is not a fourth kind of balance — it is one of the locks that make an account's funds frozen in the first place,
so a vesting user's coins were already inside the Locked bar before this category existed. Vested simply names that
slice. The four bars sum to 100%.

The split is computed **per balance, in token units, before anything is converted to fiat or summed with any other
account** (`lib/computeAllocation.ts`). That matters because of two `pallet_balances` rules:

- `frozen` is the **maximum** of an account's locks and freezes, never their sum — locks overlap. An account with 40
  vesting and 60 staked has 60 frozen, not 100, and the bars show Locked 20 / Vested 40.
- `reducible_balance` discounts `reserved` from `frozen` (`untouchable = frozen − reserved`), so a vesting lock fully
  covered by an account's reserved balance restricts nothing and must not show up as Vested at all.

Clamping each balance's Vested to its own Locked keeps both rules honest and, critically, stops one account's vesting
lock from being subtracted from a **different** account's Locked share.

The vesting lock only shrinks when `vesting.vest()` runs, so it still covers funds that have vested but were never
claimed. Those funds really are untransferable until the claim lands, so counting them as Vested reflects what the
balance actually does — the Vested bar and the claim callout below it are describing the same coins.

All four bars always render, even at 0.0% — the set of categories is fixed, so the card reads the same way for every
account and a user can see that they have no vesting rather than having to infer it from an absent bar.

The per-row allocation bars inside the detail modals are a separate, **stacked** three-segment bar
(transferable/locked/reserved) and deliberately still **fold vesting into Locked** — the Vested split exists only at the
portfolio level.

### Holdings

- **By Asset** groups balances by price feed, so the same token across chains (DOT on Polkadot and on Asset Hub) merges
  into one row. **By Chain** groups by chain and counts distinct priced assets.
- Both are sorted by fiat value descending, zero-value rows dropped. There is no "other" bucket, no minimum-percentage
  grouping and no row cap — the list scrolls.
- Asset colors are brand-first (Polkadot pink, Kusama black, USDT, USDC…) and fall back to a shared palette; the
  fallback cursor only advances for unbranded assets, so branded tokens do not burn palette slots. The chain view is
  purely positional.
- A 24h price change indicator sits next to each asset's value, and is omitted entirely when the change is unknown or
  exactly zero.
- Shares in the detail modals are **rounded down** to one decimal, so a column of shares can visibly sum to slightly
  under 100%.

## Lifecycle

The user opens the Overview tab and picks accounts; the card subscribes balances for that selection, renders the total
(skeleton → value), the distribution bars, the vesting callout slot, then the holdings block. From there the
interactions are local: toggle asset/chain view (not persisted — it resets on remount), click a row for the breakdown
modal, sort that modal by amount / value / share, hover for donut and allocation tooltips. The card never navigates
away; the only outbound flow is the vesting-claim callout it hosts.

## Related

- `pages/Dashboard` — hosts the widget slot and owns the account selection.
- [`vesting-claim`](../vesting-claim/README.md) — injects its callout into this card's vesting slot, and supplies the
  claim flow behind it. This card in turn renders the **Vested** distribution category the vesting data makes possible.
- `features/assets-balances` — the balance subscriptions this card starts for the selection.
- `aggregates/currency-select`, `domains/price` — the fiat toggle, active currency and price feeds everything here
  depends on.
