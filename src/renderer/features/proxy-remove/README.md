# Remove proxy

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-11-20

## Overview

Takes delegated authority away from a proxy (`proxy.removeProxy`). For a **pure proxy** whose last remaining proxy is
being removed the account itself is destroyed instead (`proxy.killPure`) — a pure proxy with no proxies would be
unreachable, so removing the last one and closing the account are the same act.

## Who can use it / when it applies

- Opened on one specific proxy of one of the user's accounts.
- When the acting account is a multisig, a signatory is picked first and a multisig deposit applies; the operation then
  starts as a pending multisig operation.

## States / scenarios

| State        | When it appears                                           | What the user sees                                                                                       |
| ------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Signatory    | The flow opens on a multisig with more than one signatory | The signatory and signing-path choice; with a single possible signatory this step is passed on its own   |
| Confirmation | A signatory is known                                      | The proxy being removed (or the pure proxy being closed), the fee and the multisig deposit               |
| Signing      | Sign is pressed on the confirmation                       | The wallet's signing screen                                                                              |
| Submitting   | Signed                                                    | Submission progress; on success the proxy is dropped locally and a closed pure proxy's wallet is removed |
| Basket       | The operation was added to the basket instead of sent     | A short success message; nothing goes on chain                                                           |
| Draft saved  | Draft mode was on                                         | The call is stored for someone else to sign                                                              |

What is signed is the transaction the confirmation holds. If the transaction is prepared again while the confirmation is
open — the signing route changed — the confirmation takes the new one before it can be signed. A multisig initiator is
taken to the pending operation when the flow closes.

## Related

- [`operations`](../operations/README.md#what-gets-signed) — the shared confirm → sign → submit shell; the confirmation
  step hands to signing exactly the transaction it shows, and refuses a sign request while that call duplicates a
  pending multisig operation.
- [`proxies`](../proxies/README.md) — where the existing proxies are read from and shown.
- [`proxied-wallet`](../proxied-wallet/README.md) — the wallet that disappears when a pure proxy is closed.
- [`signing-path`](../signing-path/README.md), [`drafts`](../drafts/README.md) — who signs and where a saved operation
  goes.
