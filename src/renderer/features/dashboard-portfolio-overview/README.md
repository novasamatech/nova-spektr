# Portfolio Overview

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-20

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

The card is a dashboard widget with a default place and a default size on the grid, and a minimum size below which the
donut and the holdings list stop fitting. Users arrange and resize widgets themselves in edit mode, so both are defaults
rather than guarantees.

The donut does not animate. Every hover re-renders the ring, and an animated Recharts pie mounts and unmounts its
animation wrapper on each of those renders — sweeping a pointer across the ring queues them faster than React can flush
them. A 400ms flourish is not worth a chart that can crash under a mouse gesture.

- Like every widget on the grid it can be **hidden** in edit mode and brought back from the header's **"Add widget"**
  menu — see the [Dashboard spec](../../pages/Dashboard/README.md).

## States / scenarios

| State                | When it appears                                                   | What the user sees                                                                                         |
| -------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Fiat off             | Global "show fiat" toggle is off                                  | Title + "fiat disabled" hint + the injected vesting block only; no total, bars or holdings                 |
| No selection         | No accounts selected                                              | Title + "Select accounts above to view your balance"                                                       |
| Loading              | Prices/currency not resolved, or no balance record has landed yet | Skeleton mirroring the final layout                                                                        |
| No tokens            | Prices resolved, selection holds nothing priced and no vesting    | Title + `$0` + vesting slot + a centered "No tokens to show" message                                       |
| Overview             | Data ready                                                        | Fiat total, Assets/Networks toggle, distribution bar + chips, vesting slot, donut + list                   |
| Balance-type filter  | A bar segment or chip clicked                                     | Donut, list and detail modals re-scope to that balance type; scope label + color follow; "Show all" clears |
| Donut hover          | Pointer over a donut segment                                      | Center swaps to the hovered slice's value, name and share; a single holding renders as a ring              |
| Asset / chain detail | A holdings row is clicked                                         | Modal with a per-address (asset view) or per-asset (chain view) breakdown                                  |
| Syncing              | Any selected chain is still connecting                            | A small spinner beside the distribution label; the numbers keep updating as balances arrive                |

The card has **no error state**: missing prices degrade into the loading / suppressed states above. The injected vesting
callout brings its own error boundary precisely because this slot offers none.

The **No tokens** state is a real "the selected accounts hold nothing" answer, told only once we are confident of it —
not a lie flashed while balances are still arriving.

Zero holdings is not evidence on its own. A balance of **zero** produces no holding and no allocation, exactly like a
balance that has not been read yet, so the rendered emptiness is identical in both cases. What separates them is the
**presence of a balance record**: the subscription writes one for every (account, chain, asset) pair it queries, zero
balances included, so the first record landing is the moment "nothing to show" becomes a statement about the accounts
rather than about the app's own progress. Until then the card shows its skeleton — the same rule the Portfolio page
shimmers on, where a row with no record renders a skeleton and never a zero.

This replaced a short wall-clock grace measured from mount, which on a cold start expired long before balances arrived
and told users with substantial holdings that they had none, while the Portfolio page was still shimmering for the very
same accounts.

A **backstop** remains, at 30s per selection, because a chain whose RPC is down keeps retrying for the life of the app
and its records never arrive; without a bound the skeleton would never resolve. It bounds the wait rather than deciding
the answer. Once the empty message is shown, a small "Syncing balances…" spinner stays on it while any chain is still
connecting, so a late-arriving balance reads as expected rather than as the message having been wrong. The vesting slot
stays mounted in this state, since token-denominated vesting can exist with a zero fiat total.

### Distribution by balance type

A segmented bar plus a row of chips over four categories — **Transferable / Reserved / Locked / Vested** — each labelled
with its own fiat value. Only categories with a non-zero fiat share get a bar segment; the Vested chip additionally
appears whenever there is vesting to report — unpriced, or overlapping Reserved — even if its bar share is zero (see
"Vesting that has no slice" below).

The bar and the chips are a **cross-filter over the holdings lists**, not just a legend: clicking a segment or a chip
scopes the donut and the list below to that balance type (the list then shows each holding's share of that type's
total), and the scope label and accent color follow the selection. **"Show all"** — or clicking the already-active chip
— clears the filter. The only chip that cannot filter is one with no priced rows behind it at all — vesting that exists
solely on an unpriced chain.

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
relabelled Vested.

#### Vesting that has no slice

The cap above has a consequence severe enough to need its own treatment. In `pallet_balances`, `frozen` is a floor on
**`free + reserved`**, not a claim on a slice of it — which is why the untouchable part of `free` is `frozen − reserved`
(`AccountData::frozen` and `reducible_balance` in `polkadot-sdk`). A hold can therefore satisfy a vesting lock outright:
a staker with 10,000 held and 5 still vesting has that 5 already covered, and **nothing in `free` is immobilised by the
vesting at all**. Since staking on Asset Hub holds funds, this is the normal case for anyone who both stakes and vests,
not an edge case.

The partition then reports Vested as zero — correct for a bar whose segments must sum to the total, and a lie by
omission to a user the card is simultaneously telling they have active vesting schedules. Neither obvious fix is
acceptable: hiding the category contradicts the callout, and subtracting it from Reserved understates a raw chain figure
the user can check against a block explorer.

So the overlapping amount is computed separately (`vestingOverlapBN`) and kept **outside** the partition:

- The **chip is always shown** when there is any vesting, printing the whole vesting lock — the figure that matches the
  schedules the callout counts — with a hatched swatch marking it as overlapping rather than adjacent.
- The chip **cross-filters like any other**, and under overlap that is its main job: scoping the holdings lists is the
  only way to see _which_ assets, on which networks, sit under a schedule. This is why the lists count vesting through
  `splitBalanceForHoldings` (the whole lock) while the bar partitions through `splitBalanceByType` (capped) — the rows
  the filter selects then add up to the figure on the chip. Those buckets deliberately do **not** sum to the balance and
  must never be fed to anything that partitions.
- The **bar** folds the vested slice back into the segments it covers and draws the vesting as a hatched marker across
  them, so the partition stays exact and Reserved keeps its true width. The marker is a **locator, not a share**: it
  honours the same 6px floor as the segments, since a trace of vesting inside a large reserved balance would otherwise
  be sub-pixel and invisible, and seeing which part of the bar is affected is the point of drawing it. It is
  click-through — the hit target stays the segment underneath — and its start is clamped so the floor cannot push it
  past the bar's rounded end.

The vesting lock only shrinks when `vesting.vest()` runs, so it still covers funds that have vested but were never
claimed — they really are untransferable until the claim lands. **The Vested chip and the claim callout therefore
describe the same coins; the Vested bar segment describes only the part of them that restricts `free`.**

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
- The modals **inherit the active balance-type filter**: rows carry only that type's amount and fiat (through the same
  `splitBalanceForHoldings` buckets the lists are filtered by), addresses/assets holding none of it are dropped, shares
  are recomputed against the scoped sum, and the header shows the scoped total with a colored dot + type label next to
  the row count. The per-row allocation bar keeps showing the full four-category split — under a filter it is what
  explains the rest of that address's holding.
- The per-row bars give **"vesting that has no slice"** the same treatment as the distribution bar: vesting riding on
  reserved funds joins no segment but is drawn as a hatched marker (with the same 6px visibility floor) across the
  segments it covers, and the legend's Vested entry — hatch-swatched under overlap — prints the **whole** vesting lock,
  so its figure matches the row amount the Vested filter selected rather than the partition's capped slice.
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
