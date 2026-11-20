# Add proxy

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-11-20

## Overview

Gives another account delegated authority over one of the user's accounts (`proxy.addProxy`): the user picks the
network, the account that delegates, the delegate's address and the proxy type. The delegating account pays a proxy
deposit that stays reserved while the proxy exists.

## Who can use it / when it applies

- Opened for one of the user's wallets; the proxy types offered are the ones the chosen network defines.
- When the delegating account is a multisig, a multisig deposit and the fee also apply and are checked against the
  signatory's balance; the operation then starts as a pending multisig operation.

## States / scenarios

| State        | When it appears                                       | What the user sees                                                                                       |
| ------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Form         | The flow opens                                        | Network, account, signing path, delegate address and proxy type, with the deposit and fee                |
| Confirmation | The form is submitted outside draft mode              | The delegate, the proxy type, the deposits and the fee; "Add to basket" when the wallet supports it      |
| Signing      | Sign is pressed on the confirmation                   | The wallet's signing screen                                                                              |
| Submitting   | Signed                                                | Submission progress; on success the flow ends and the accounts are synchronised to pick up the new proxy |
| Basket       | The operation was added to the basket instead of sent | A short success message; nothing goes on chain                                                           |
| Draft saved  | Draft mode was on when the form was submitted         | The call is stored for someone else to sign                                                              |

What is signed is the transaction the confirmation holds — the one built when the form was submitted. A multisig
initiator is taken to the pending operation when the flow closes.

## Related

- [`operations`](../operations/README.md#what-gets-signed) — the shared confirm → sign → submit shell; the confirmation
  step hands to signing exactly the transaction it shows, and refuses a sign request while that call duplicates a
  pending multisig operation.
- [`proxies`](../proxies/README.md) — where the existing proxies are read from and shown.
- [`proxy-verify`](../proxy-verify/README.md) — proving a delegate's authority after it was added.
- [`signing-path`](../signing-path/README.md), [`drafts`](../drafts/README.md) — who signs and where a saved operation
  goes.
