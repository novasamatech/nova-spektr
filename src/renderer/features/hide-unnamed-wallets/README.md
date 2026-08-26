# Hide Unnamed Wallets

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-26
>
> **Draft — pending author review.** Written from reading the code; needs sign-off from the feature owner before it is
> treated as the source of product truth.

## Overview

One toggle in the wallet switcher's header that clears away every wallet the app named on the user's behalf, and puts
them all back again. Account discovery can surface hundreds of multisigs and proxied accounts the user has rights over
but never asked for; without this the switcher becomes unusable.

It is a single reversible action, not a per-wallet setting: hide all, or unhide all.

## Who can use it / when it applies

Only ever touches **multisig, flexible-multisig and proxied** wallets — the types the app names itself. Every other type
got its name from the user during pairing, so there is nothing to clean up.

Within those types, a wallet counts as unnamed when nothing gives it a real name:

- its account's name is one the app generated, and
- no address-book contact matches the account, and
- no on-chain identity matches the account.

**Why the name is inspected and not just the "generated" flag.** Storage migration 14 stamped every account that
predated the flag as user-named, including multisigs whose name had always been derived from their address. Trusting the
flag alone left those wallets behind — on an older profile the toggle would hide a fraction of what it should. The rule
therefore also treats a name that _is_ the app's own generated name for that account — its shortened address, or
`<ProxyType> for <shortened address>` / `<ProxyType> for pure <shortened address>`, regenerated from the account's own
address in every prefix and chunk size the app has ever used — as generated, whatever the flag says. Only an exact match
counts: a user-typed name that merely looks like a shortened address (`Team...Fund`) is kept.

## States / scenarios

| State    | When it appears                                   | What the user sees                                 |
| -------- | ------------------------------------------------- | -------------------------------------------------- |
| `hide`   | At least one unnamed wallet is currently visible  | Eye button — pressing it hides them all            |
| `unhide` | None visible, but some were hidden by this action | Crossed-out eye — pressing it brings them all back |
| `none`   | There are no unnamed wallets at all               | Nothing to do                                      |

While the change is being written, the switcher's list shows a loader and the button flips to its opposite state
immediately, so the toggle feels instant even though storage is still catching up.

Wallets hidden this way are marked as hidden **by the app**, which keeps them out of the
[`hidden-wallets`](../hidden-wallets/README.md) settings screen — that screen is for wallets the user hid one by one,
and this action has its own undo right here.

## Lifecycle

1. Discovery adds multisig/proxied wallets; the ones the user never named make the toggle offer "hide".
2. The user presses it; all of them are marked hidden at once and disappear from the switcher.
3. The button flips to "unhide" and stays that way until pressed again.
4. Newly discovered unnamed wallets appear as visible again, which flips the button back to "hide" — the action is a
   one-shot clean-up, not a standing filter.

## Related

- [`hidden-wallets`](../hidden-wallets/README.md) — the settings screen for wallets the user hid individually.
- `wallet-select` — the switcher whose header this toggle lives in and whose list it shortens.
