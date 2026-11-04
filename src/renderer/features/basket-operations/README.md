# Basket operations

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-10-28

## Overview

The basket is where a Polkadot Vault wallet parks operations it built but did not sign yet — the staking, transfer,
proxy and governance forms offer **Add to basket** next to **Sign**. This feature is the basket page: the stored
operations of the selected wallet, their standing against the live chain, and the sign flow that takes one or several of
them to the wallet's signing screen in a single session.

## Who can use it / when it applies

Only a wallet the basket can sign for — the Polkadot Vault group. Watch-only, multisig, proxied and WalletConnect
wallets have no basket. The page lists the entries whose initiator is one of the selected wallet's accounts; switching
wallet switches the list.

## States / scenarios

| State             | When it appears                                                       | What the user sees                                                                                               |
| ----------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Empty             | The wallet has nothing in its basket                                  | An illustration and "no operations"                                                                              |
| Nothing matches   | Entries exist but the type / network / status filters hide them all   | The same illustration with a "nothing matches" note                                                              |
| Checking          | An entry's check has not returned, or its chain is not connected yet  | A status skeleton; the row can be neither selected nor opened                                                    |
| Valid             | The check returned no error                                           | A plain row: selectable, and a click opens its sign modal                                                        |
| Failed check      | The signer cannot cover the fee, or the check itself threw            | A red **Validation error** badge with the reason on hover; the row can be neither selected nor opened            |
| Chain error       | A previous submission of this entry failed on chain                   | An orange badge stamped with the date, the chain's message on hover; the row stays signable once it checks clean |
| Sign modal — one  | A valid row is clicked, or one entry is selected and **Sign** pressed | The operation's title and details (injected by its domain's basket flow) and the wallet's Sign button            |
| Sign modal — many | Several entries are selected and **Sign** pressed                     | A slider with one confirm per entry and a single Sign button                                                     |
| Sign / Submit     | Sign pressed                                                          | The shared signing and submission screens; every selected entry is signed in one session, one payload each       |

- **Checks run on their own.** Every entry is checked once all the chains in the list are connected, and again whenever
  the list changes; **Refresh** reruns the checks by hand. An entry with no verdict reads as still checking, never as
  clean.
- **Select all picks only the entries that passed.** The header checkbox selects the checked-and-clean rows; the list's
  **Sign** button waits until something is selected and nothing selected is still checking.
- **The sign gate is the model's own.** The modal's Sign button is disabled until every selected entry has a verdict,
  none is still being checked and none failed — and the flow refuses on the same terms: Sign pressed past that gate
  moves nothing and hands nothing to the signer.
- **Delete is undoable.** Removing an entry shows a toast with **Undo** that puts it back.

## Lifecycle

Sign opens the modal on the selected entries and re-runs their checks. Once clean, Sign hands one signing payload per
entry to the shared signing step — the stored core call, signed directly by its initiator, with no multisig or proxy
wrapping (the basket only exists for Vault wallets, which sign for themselves). After submission the entries that landed
are removed from the basket; the ones that failed stay, stamped with the chain's error and the date, to be fixed and
retried.

## Related

- [`basket-operations` (aggregate)](../README.md#basket) — the stored entries and the selection.
- The domain basket flows (`staking-basket`, `transfer-basket`, `proxy-basket`, `governance-basket`,
  `fellowship-basket`) inject each entry's title and details into this page's slots.
- Every operation form's **Add to basket** button is what fills the basket; see the form's own spec.
