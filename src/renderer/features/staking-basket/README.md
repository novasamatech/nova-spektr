# Staking in the Basket

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-19

## Overview

What a **staking operation looks like once it is in the basket**, and what happens to it when the user signs the basket
later.

The basket is a generic queue: it stores a call and knows nothing about what the call does. This module is staking's
half of that contract — it names the queued operation ("Unstake", "Change Validators"), shows its amount and chain in
the list, rebuilds the full confirmation the user would have seen in the live flow, and re-runs staking's own validation
before signing.

## Who can use it / when it applies

- Applies to any basket entry whose core call is a staking call. Nothing here is user-facing on its own: the basket page
  hosts it.
- Basket entries are signed **directly by the account that created them** — the basket does not wrap calls in a multisig
  or a proxy — which is why the flows only offer "Add to basket" for wallets that can sign the call themselves.

## What each queued operation shows

| Call       | Row title                | Amount shown     |
| ---------- | ------------------------ | ---------------- |
| bond       | "Start Staking"          | bonded value     |
| nominate   | "Change Validators"      | —                |
| stake more | "Stake More"             | additional value |
| unstake    | "Unstake"                | unbonded value   |
| restake    | "Restake"                | re-bonded value  |
| redeem     | "Withdraw Unstaked"      | withdrawn value  |
| set payee  | "Set reward destination" | —                |
| claim      | "Claim Rewards"          | —                |

A call this table does not name renders no title at all rather than a guess — the basket's own generic presentation
takes over.

## Re-derived at open, never stored

Opening a queued staking operation rebuilds its confirmation from the chain as it is **now**, not from what was true
when the entry was queued: the fee is re-estimated, the active era re-read, and for a nomination the validator set
re-fetched so the confirmation names the validators rather than bare addresses.

That is the point of the delay. A basket entry can sit for days, and a confirmation replayed from stored figures would
show a stale fee and a validator list from an era that has ended. Redeem goes furthest and re-reads the ledger, because
"what is withdrawable" is exactly the number that moves while an entry waits.

**Validation runs again at sign time, per operation type**, and its verdict is the basket's — not the one the flow
reached when the entry was created. A queued unstake whose ledger has since changed must fail in the basket even though
it was valid when queued.

## Known coverage gap

Claim rewards is named and iconed in the list, but has **no confirmation panel and no re-validation** of its own: the
detail area is empty and the entry passes the validation step unconditionally. Everything else in the table above has
both. Until that is filled in, a basketed claim is signed on less checking than any other staking operation in the
queue.

## Related

- **basket-operations** — the queue itself: storing, listing, signing, and the slots this module injects into.
- **operations/OperationsConfirm, operations/OperationsValidation** — the confirmation components and validators shared
  with the live staking flows, which is what keeps a basketed operation and a live one from disagreeing.
- [`staking-claim-rewards`](../staking-claim-rewards/README.md),
  [`staking-amount-flow`](../staking-amount-flow/README.md), [`staking-confirm-flow`](../staking-confirm-flow/README.md)
  — the flows that put staking operations here.
