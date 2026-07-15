# Governance Operation Details

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-07-15

## Overview

Presents **OpenGov governance operations** in the multisig [Operations view](../multisig-operations/README.md): a human
title and icon per governance action, the amount involved, and vote- or delegation-specific rows in the expanded Details
panel.

## Who can use it / when it applies

Applies automatically to any multisig operation whose (core) call is one of the governance actions:

| Call            | Row title           | Amount shown                      |
| --------------- | ------------------- | --------------------------------- |
| vote            | "Vote"              | vote balance (without conviction) |
| remove vote     | "Remove vote"       | —                                 |
| unlock          | "Unlock"            | unlocked value                    |
| delegate        | "Delegate"          | delegated balance                 |
| undelegate      | "Revoke delegation" | —                                 |
| edit delegation | "Edit Delegation"   | the new delegated balance         |

The asset is resolved from the call's asset id. Each action carries its own icon.

## Expanded Details panel

Added to the shared rows, by action group:

- **Votes** (vote / remove vote / unlock):
  - **Referendum** — the referendum number (`#id`), when the call carries one.
  - **Number of votes** — the decision ("Aye" / "Nay" / "Abstain") with the voting power: conviction-weighted balance
    for a standard vote, the abstained balance for a split-abstain vote.
- **Delegations** (delegate / undelegate / edit delegation):
  - **Delegate** — the delegation target, resolved to a name. For an undelegation the target is looked up on-chain from
    the account's current delegating state (skeleton rows while loading).
  - **Number of votes** — the conviction-weighted voting power delegated (looked up on-chain for undelegations).
  - **Tracks** — the governance tracks the delegation covers.

## Supported wrappers

- **`proxy.proxy`** — for flexible multisigs the call is unwrapped before matching.
- **`utility.batchAll`** — partially. The Details components and amount extraction read through governance batches
  (edit-delegation is itself a delegate+undelegate batch; unlock ships with remove-vote), but the row **title and icon**
  match only a direct governance call — a batch whose outer call is `batchAll` falls back to the generic
  `section: method` title.

## Confirmation step

No contribution — the approve/sign confirmation shows only the shared operation summary for governance operations.

## Related

- [`multisig-operations`](../multisig-operations/README.md) — hosts the row, the Details panel slot, and the fallback
  presentation.
- **Governance flows** (`features/governance-*`) — produce these operations.
