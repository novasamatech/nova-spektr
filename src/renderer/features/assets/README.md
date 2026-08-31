# Assets

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-30

## Overview

The asset list of the selected wallet, in two interchangeable shapes, plus the controls that shape it. The module owns
what the user sees on the Assets page: which tokens appear, how they are grouped, what a zero balance does, and where
"transfer" and "receive" lead.

Its submodules:

- **`AssetsPortfolioView`** — token-centric list. One row per token, with the token's chains folded into it, so a wallet
  holding DOT on several networks sees one DOT row that expands.
- **`AssetsChainView`** — chain-centric list. One section per network, ordered by fiat balance, listing that network's
  assets.
- **`AssetsSettings`** — the two persisted preferences: hide-zero-balances and which of the two views is active.
- **`AssetsSearch`** — the query the two views filter by.
- **`AssetRouteGuard`** — resolves the `chainId` / `assetId` URL parameters into a chain and an asset for the routes
  that need them.

## Who can use it / when it applies

The Assets page renders the active view; everything else reaches this module through the exported models rather than
reimplementing the list. Balances themselves are not fetched here — `assets-balances` owns the subscription, and this
module groups and presents what it publishes.

The token-centric view needs one thing the chain-centric view does not: the **remote tokens config**
(`TOKENS_CONFIG_URL`), which says which chains a token lives on. It is fetched once on entry and persisted under
`assets_with_chains`, so a later launch renders from the stored copy while the fresh one loads.

## States / scenarios

| Situation                                     | Behaviour                                                                                                            |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Wallet or selected shards change              | The list is rebuilt for the accounts that can act on each chain; nothing is carried over from the previous selection |
| Hide-zero-balances is on                      | A token keeps only the chains where it has a non-zero balance; a token left with no chains drops out of the list     |
| A search query is entered                     | Both views filter by it, and an empty result renders the empty state rather than a blank page                        |
| The tokens config fetch fails or is malformed | The previously persisted config is kept and the view renders from it — see below                                     |
| The tokens config has never been fetched      | The token-centric view has no chain grouping to show and stays empty until a fetch succeeds                          |
| `chainId` / `assetId` do not resolve          | `AssetRouteGuard` redirects to its configured path with `replace: true`, so back does not return to a dead route     |

**Why a failed config keeps the old one.** The config is a remote JSON file, and it is validated all-or-nothing against
a schema before it is trusted. Accepting a partial payload would overwrite the persisted copy with a shorter list, and
tokens would silently disappear from a wallet that still holds them — a missing row reads as a missing balance. So a
payload that does not validate is rejected whole, logged, and the last good copy stays in place.

## Related

- `assets-balances` — owns the balance subscription this module renders; also the source of the `AmountInput` used by
  the flows launched from a row.
- `assets-navigation`, `assets-transaction` — the routes and the transfer/receive entry points a row leads to.
- `@/shared/api/network` `chainsService` — the chains config, validated by the same all-or-nothing policy, and
  `sortChainsByBalance`, which orders the chain-centric sections.
