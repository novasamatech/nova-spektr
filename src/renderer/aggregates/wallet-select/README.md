# Wallet Select

> Part of the [Feature Map](../../features/README.md) — Last reviewed: 2026-08-19

## Overview

Holds the **active wallet** — the single answer to "whose money am I looking at" that every screen in the app is scoped
by — plus the accounts that wallet owns, and the grouping and search helpers the wallet switcher renders itself with.

It is one store because the answer has to be one answer. Balances, operations, staking, governance and the dashboard all
read the same selection, so switching wallets in the sidebar re-scopes the whole app in one step and no screen can be
left showing a wallet the user has moved on from.

## Who can use it / when it applies

- Always. There is no flag and no precondition; the app is never in a state where "which wallet" is meaningless.
- The selection is **persisted and shared across windows**, so it survives a restart and a second window follows the
  first.
- Selecting is guarded: an id that matches no existing wallet is ignored rather than blanking the selection. Selection
  requests come from persisted storage and from callers holding a stale list, and neither is a reason to leave the app
  with no active wallet.

## States / scenarios

| State           | When it appears                                    | What the rest of the app sees               |
| --------------- | -------------------------------------------------- | ------------------------------------------- |
| No wallets      | The user has not created or paired one yet         | No selected wallet, no accounts             |
| Selected        | A wallet is chosen, or was restored from storage   | That wallet and its accounts                |
| Stale selection | The stored id names a wallet that no longer exists | Repaired to the first wallet available      |
| Switched        | The user picks a different wallet                  | Everything re-scopes; a switch signal fires |

**A missing or unknown selection repairs itself to the first wallet.** The alternative — leaving the app unscoped until
the user notices — turns a deleted wallet into a blank screen with no obvious way out. Removing the active wallet
therefore lands the user on another one rather than on nothing.

**The switch signal fires only on a real change.** Re-selecting the wallet already active leaves the store untouched and
the signal silent, so consumers can treat it as "the user is now on a different wallet" and re-seed their state on it —
rather than as "the wallet selector was clicked", which would reset half-filled forms under the user for no reason.

## What it does not decide

- **Which accounts a screen shows.** This aggregate offers the selected wallet's accounts; a screen that additionally
  lets the user tick accounts (the dashboard's picker) narrows that list itself.
- **Whether an account can sign.** That is the signing path's question, not a property of the selection.

## Related

- **wallet-select feature** (`features/wallet-select`) — the switcher UI that renders the grouped, searchable list this
  aggregate composes.
- **Network domain** — owns the account list this aggregate filters by wallet.
