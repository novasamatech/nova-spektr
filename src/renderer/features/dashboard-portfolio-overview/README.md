# Portfolio Overview

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-07-17

## Overview

The first card of the Dashboard's **Overview** tab: a fiat snapshot of everything the selected accounts hold across
every connected chain. One card layers a grand total, a **distribution by balance type** that doubles as a cross-filter,
and a donut + list breakdown that flips between **By Asset** and **By Chain**, each row opening a per-address /
per-asset detail modal. Just below the distribution the card hosts a slot into which the separate vesting-claim feature
injects its callout.

Everything above the vesting slot is fiat-first — the card answers "what am I worth, in what, and in what shape", so an
asset with no price feed simply does not appear there (the only exception is a vesting lock on an unpriced chain, which
still surfaces as a token amount on the Vested chip).

## Who can use it / when it applies

- Gated by the **`dashboard`** feature flag.
- Needs at least one account selected in the dashboard's account picker; with an empty selection the card renders its
  own "No accounts selected" state.
- With the global **"show fiat"** toggle **off** the card does **not** disappear (it used to). It stays visible showing
  only its title, a short hint, and the injected vesting block — the token-denominated vesting callout is still useful
  when fiat is hidden, while the fiat-driven total, distribution and holdings are all suppressed.
- Only balances whose asset has a price feed in the active currency are counted in the total, the distribution, the
  donut and the lists. Unpriced assets are otherwise invisible here (the Assets page remains the complete view); the one
  exception is a **vesting lock on an unpriced chain**, which is surfaced as a token amount on the Vested chip so the
  chip stays consistent with the vesting callout below it.
- The card is what drives balance subscriptions for the selection: wallet accounts directly, and contact addresses
  paired with every chain whose address scheme matches the key — so a substrate key is never queried on an EVM chain.

The card sits in the dashboard widget slot at the default first position, but users can drag-reorder widgets in edit
mode, so its position is a default rather than a guarantee.

## States / scenarios

| State                | When it appears                        | What the user sees                                                                            |
| -------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| Fiat off             | Global "show fiat" toggle is off       | Title + "fiat disabled" hint + the injected vesting block only; no total, bars or holdings    |
| No selection         | No accounts selected                   | Title + "Select accounts above to view your balance"                                          |
| Loading              | Prices/currency not resolved yet       | Skeleton mirroring the final layout                                                           |
| Overview             | Data ready                             | Fiat total, Assets/Networks toggle, distribution bar + chips, vesting slot, donut + list      |
| Balance-type filter  | A bar segment or chip clicked          | Donut and list re-scope to that balance type; scope label + color follow; "Show all" clears   |
| Donut hover          | Pointer over a donut segment           | Center swaps to the hovered slice's value, name and share; a single holding renders as a ring |
| Asset / chain detail | A holdings row is clicked              | Modal with a per-address (asset view) or per-asset (chain view) breakdown                     |
| Syncing              | Any selected chain is still connecting | A small spinner beside the distribution label; the numbers keep updating as balances arrive   |

The card has **no error state**: missing prices degrade into the loading / suppressed states above. The injected vesting
callout brings its own error boundary precisely because this slot offers none.

### Distribution by balance type

A segmented bar plus a row of chips over four categories — **Transferable / Reserved / Locked / Vested** — each labelled
with its own fiat value. Only categories with a non-zero fiat share get a bar segment; the Vested chip additionally
appears when there is unpriced vesting to report even if its fiat share is zero.

The bar and the chips are a **cross-filter over the holdings lists**, not just a legend: clicking a segment or a chip
scopes the donut and the list below to that balance type (the list then shows each holding's share of that type's
total), and the scope label and accent color follow the selection. **"Show all"** — or clicking the already-active chip
— clears the filter. A category that has only unpriced vesting behind it is shown but is **not** clickable as a filter,
because it has no fiat rows to scope.

Vesting is not a fourth kind of balance — it is one of the locks that make an account's funds frozen in the first place,
so a vesting user's coins were already frozen before this category named that slice. The split is computed **per
balance, in token units, before anything is converted to fiat or summed with any other account**, via a single source of
truth (`splitBalanceByType`). Two `pallet_balances` realities shape it:

- `frozen` is the **maximum** of an account's locks and freezes, never their sum — locks overlap, so a clean partition
  is impossible when a vesting lock coexists with a staking or governance lock.
- On `holdAndFreezes` chains a freeze covered by `reserved` does not reduce transferable, so an account can carry a
  vesting lock while its Locked bucket is zero (the lock rides on reserved funds).

The rule is **vesting-priority within Locked**: the vesting lock is carved out of the Locked bucket first, so it never
hides behind a larger overlapping governance/staking lock, and Locked is the remainder. The cost of the overlap is that
funds held by both a vesting lock and a larger non-vesting lock are labelled Vested even though the other lock would
still hold them after `vest()`. Vested is **capped by the Locked bucket** and never touches **Reserved** — reserved
funds have their own causes (staking holds, deposits) that locks know nothing about, so a staking hold is never
relabelled Vested. On `holdAndFreezes` chains the part of a vesting lock that rides on reserved funds therefore stays in
Reserved.

The vesting lock only shrinks when `vesting.vest()` runs, so it still covers funds that have vested but were never
claimed. Those funds really are untransferable until the claim lands, so counting them as Vested reflects what the
balance actually does — the Vested category and the injected claim callout describe the same coins.

### Holdings

- **By Asset** groups balances by price feed, so the same token across chains (DOT on Polkadot and on Asset Hub) merges
  into one row. **By Chain** groups by chain and counts distinct priced assets; under a balance-type filter the count
  re-scopes to assets that actually hold that balance type on the chain.
- Both are sorted by fiat value descending **within the current scope** (under a filter, by that type's fiat),
  zero-value rows dropped, and each row shows its **share of the currently scoped total** (the whole portfolio, or the
  active balance-type slice). There is no "other" bucket, no minimum-percentage grouping and no row cap — the list
  scrolls.
- The donut mirrors the list: hovering a segment swaps the center to that slice's value/name/share and dims the rest; a
  lone holding renders as a full ring rather than being hidden.
- Asset colors are brand-first (Polkadot pink, Kusama black, USDT, USDC…) and fall back to a shared palette; branded
  tokens do not consume palette slots. A 24h price change indicator sits next to each asset's value and is omitted when
  the change is unknown or exactly zero.

### Detail modals

Clicking a holdings row opens a breakdown modal:

- **Asset detail** (from the By Asset view) lists one row **per address** holding that token, with the account name
  resolved through `NamedAccount` — the same resolution chain used everywhere else, including on-chain identity as a
  fallback. Each row shows its amount, fiat value, and share, plus a **per-row allocation bar with a legend** breaking
  that address's holding into the same four categories (transferable / reserved / locked / vested).
- **Chain detail** (from the By Chain view) lists one row **per asset** on that chain.
- Shares inside the modals are **rounded down** to one decimal, so a column can visibly sum to slightly under 100%.

## Lifecycle

The user opens the Overview tab and picks accounts; the card subscribes balances for that selection, renders the total
(skeleton → value), the distribution bar, the injected vesting callout, then the holdings block. From there the
interactions are local: toggle Assets/Networks (not persisted — resets on remount), cross-filter by balance type, hover
the donut, open a detail modal and sort it. The card never navigates away; the only outbound flow is the vesting-claim
callout it hosts.

## Related

- `pages/Dashboard` — hosts the widget slot and owns the account selection.
- [`vesting-claim`](../vesting-claim/README.md) — injects its callout into this card's vesting slot and supplies the
  claim flow behind it. This card in turn renders the **Vested** distribution category the vesting data makes possible.
- `features/assets-balances` — the balance subscriptions this card starts for the selection.
- `aggregates/currency-select`, `domains/price` — the fiat toggle, active currency and price feeds everything above the
  vesting slot depends on.
