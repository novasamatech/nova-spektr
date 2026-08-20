# Watch-only Wallet

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-20
>
> **Draft — pending author review.** Written from reading the code; needs sign-off from the feature owner before it is
> treated as the source of product truth.

## Overview

Defines how an already-added watch-only wallet behaves once it exists: it can be selected and browsed like any other
wallet, but it can never sign or initiate anything. A watch-only wallet is just an address the user wants to keep an eye
on — there is no key behind it.

## Who can use it / when it applies

Applies to every account whose type is watch-only, regardless of how it was added. Not gated by a feature flag.

## States / scenarios

| Situation                     | Behaviour                                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| Any watch-only account        | Cannot perform actions — it is never offered as a signer and never appears on a signing path |
| Any watch-only account        | Available on **every** supported chain: an address is an address, so nothing restricts it    |
| Signing multiple transactions | Never allowed                                                                                |
| Account structure view        | Drawn as a "Watch Only" node in orange                                                       |

In the wallet switcher, watch-only wallets form their own group, searchable by wallet name, each row showing its live
fiat balance. Selecting one switches the app to it; the rest of the app then shows balances and history but keeps every
signing entry point closed.

**Why "available on every chain".** Other wallet types restrict availability because a key was derived for a particular
chain. A watch-only entry carries no key, so there is nothing to restrict — the same address is watchable everywhere.

## Lifecycle

1. `watch-only-wallet-pairing` creates the wallet from an address the user pasted or scanned.
2. From then on it appears in the wallet switcher's watch-only group and can be selected as the active wallet.
3. It stays read-only for its whole life — there is no upgrade path from watch-only to a signing wallet; the user adds
   the wallet again through the relevant pairing flow instead.

## Related

- `watch-only-wallet-pairing` — the onboarding flow that creates the wallet.
- `wallet-select` — the switcher this feature injects its group into.
