# Staking Operation Details

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-19

## Overview

Presents **staking operations** in the multisig [Operations view](../multisig-operations/README.md): a human title and
icon per staking action, the staked amount, and staking-specific rows (reward destination, validators) in the expanded
Details panel.

## Who can use it / when it applies

Applies automatically to any multisig operation whose (core) call is one of the staking actions:

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

The asset is resolved from the call's asset id (staking on Asset Hub is asset-based, not implicitly native). Each action
also carries its own icon.

## Expanded Details panel

Added to the shared rows (depositor, date/time, description), by action:

- **Rewards destination** — for bond / stake more / unstake / restake / redeem, when the call carries a payee: either
  "Restake rewards" or the payout account resolved to a name.
- **Validators** — for nominate (and for a bond arriving without a payee): a count button that opens the validators
  modal, listing the selected validators (with on-chain identities) against the current validator set.
- Set-payee operations add no rows of their own.

## Supported wrappers

- **`proxy.proxy`** — for flexible multisigs the call is unwrapped before matching.
- **`utility.batchAll`** — partially. Compound staking batches (bond + nominate, chill + unbond) resolve their
  **amount** through the batch's representative inner call, and the Details components read payee/validators out of
  batch entries — but the row **title and icon** match only a direct staking call, so a batch-shaped staking operation
  falls back to the generic `section: method` title.

## Confirmation step

No contribution — the approve/sign confirmation shows only the shared operation summary for staking operations.

## Related

- [`multisig-operations`](../multisig-operations/README.md) — hosts the row, the Details panel slot, and the fallback
  presentation.
- **Staking flows** (`features/staking-*`) — produce these operations; staking lives on Asset Hub chains.
