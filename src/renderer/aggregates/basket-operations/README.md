# Basket operations

> Part of the [Feature Map](../../features/README.md) — Last reviewed: 2026-09-29

## Overview

The basket is a persistent queue of prepared-but-unsigned transactions. Flows (transfers, staking, governance, proxy,
fellowship) can add a transaction to the basket instead of signing it immediately; the user later reviews the queue,
selects any subset and signs/submits them together. This aggregate owns the basket list, the user's selection and the
rules that keep both consistent.

## Who can use it / when it applies

Any wallet that can initiate transactions. Each basket entry remembers its initiator account and the signing route (e.g.
multisig or proxy chain of accounts), so it can be signed later exactly as it was prepared.

## States / scenarios

| State / rule          | When it applies                                  | What the user sees                                           |
| --------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| Loading               | Basket is read from local storage the first time | Loading state until the stored list is available             |
| Empty                 | No stored transactions                           | Empty basket                                                 |
| Listed                | Transactions were added and persisted            | Entries survive app restarts                                 |
| Selected              | User ticks entries (single toggle or bulk)       | Only selected entries go to signing                          |
| Selection reset       | User switches the selected wallet/accounts       | Selection is cleared so no stale entry is signed by accident |
| Failed on chain       | An entry's last validation/submission failed     | Entry stays in the basket with its chain error message       |
| Removed after success | Signing flow reports a successful submission     | Successfully submitted entries disappear; failed ones remain |

## Lifecycle

1. A flow adds one or more drafts → they are persisted and the list reloads.
2. User selects entries and starts signing; fees and the initiating account are resolved per entry's chain.
3. After submission, only entries with a successful result are removed; entries can also be removed manually.

For display and fee purposes each entry is reduced to its **core transaction**: a `batchAll` wrapper shows the
meaningful inner call (unlock first, then known batch-wrapped operations, else the first call). If no core call can be
identified (for example a nested batch), the entry falls back to the original transaction rather than breaking the row.
Edit-delegation batches are always shown as a whole.

## Related

- `basket-operations` feature — the basket page UI built on this aggregate.
- Domain basket flows: `staking-basket`, `transfer-basket`, `proxy-basket`, `governance-basket`, `fellowship-basket`.
