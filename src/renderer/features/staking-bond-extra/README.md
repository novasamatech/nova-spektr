# Stake more

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-11-20

## Overview

Adds funds to a stash that is already bonded (`staking.bondExtra`). The nominations are left as they are; only the
bonded amount grows, and the extra amount starts earning from the next era.

This is the Staking page's own form. The dashboard runs its own flows for the same calls; this one stays in place for
the page it was built for.

## Who can use it / when it applies

- Opened from the Staking page's actions for the selected accounts.
- Two shapes, chosen by how many accounts are selected: a **single account**, which may sign through a multisig or a
  proxy on its signing path, and a **multishard vault**, where the same operation is applied to several shards and each
  shard gets its own transaction.
- Draft mode and the signing-path picker exist in the single-account shape only.

## States / scenarios

| State        | When it appears                                       | What the user sees                                                                                       |
| ------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Form         | The flow opens                                        | The amount, the balance it can be taken from, the fee and — for a multisig — the signatory and deposit   |
| Confirmation | The form is submitted outside draft mode              | The amount, the accounts, the fee (per account and in total for several shards) and the multisig deposit |
| Signing      | Sign is pressed on the confirmation                   | The wallet's signing screen — one payload per shard in the multishard shape                              |
| Submitting   | Signed                                                | Submission progress, then the result; a multisig initiator is taken to the pending operation on close    |
| Basket       | The operation was added to the basket instead of sent | A short success message; nothing goes on chain                                                           |
| Draft saved  | Draft mode was on when the form was submitted         | The call is stored for someone else to sign                                                              |

In the multishard shape the confirmation holds one item per shard — that shard's own transaction and the account signing
it — and those are exactly the transactions sent to the signer. In the single-account shape a transaction that is still
being prepared when the confirmation opens replaces the one the confirmation holds as soon as it is ready.

## Related

- [`operations`](../operations/README.md#what-gets-signed) — the shared confirm → sign → submit shell; the confirmation
  step hands to signing exactly the transaction it shows, and refuses a sign request while that call duplicates a
  pending multisig operation.
- [`signing-path`](../signing-path/README.md) — who can sign and by which route.
- [`drafts`](../drafts/README.md) — where an operation saved in draft mode goes.
- [`staking-basket`](../staking-basket/README.md) — how a queued operation is shown and signed later.
