# Operations

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-25

## Overview

The generic **confirm → sign → submit** pipeline shared by every operation type that produces an on-chain extrinsic —
transfers, staking, governance, fellowship actions, proxy management, and multisig approve/reject. A user never
navigates to "Operations" directly; every other feature that ends in a signature routes through this one so that
validation, wallet-specific signing, and submission status handling are implemented once.

## Who can use it / when it applies

Consumed internally by any feature whose flow ends in signing an extrinsic. This feature owns the shared shell; each
operation type supplies its own confirmation content and validation rules through it (see below) rather than
reimplementing sign/submit itself.

## States / scenarios

| Area                       | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`OperationsConfirm`**    | Per-operation-type confirmation screens (one subfolder per type — Transfer, staking actions, governance actions, proxy actions, fellowship actions). Each renders its own summary and amount, but shares common building blocks (`common/`: the multisig-exists alert, the operation-description field, the call-data and signing-path sections). The dashboard staking flows (amount, confirm, reward destination) share one confirm-store factory from here (`OperationsConfirm/lib/createFlowConfirmModel`), so their confirm screens are bound to the same wallets, apis and pending multisig operations. |
| **`OperationsValidation`** | Per-operation-type validation rule sets that decide whether a confirmation can proceed — balance and existential-deposit checks plus operation rules such as the staking minimum bond — feeding each type's `canSubmit` gate. Every rule kind renders through the shared `TransactionValidationError` alert, so a transfer and a staking form report problems the same way.                                                                                                                                                                                                                                   |
| **`OperationSign`**        | Wallet-specific signing UI, switched by wallet type: Polkadot Vault (QR scan), browser Extension, WalletConnect, or a watch-only placeholder (which cannot sign). A WalletConnect session that was not approved for the transaction's chain is not asked to sign — the flow stops on a reconnect prompt first (see `wallet-connect-wallet`).                                                                                                                                                                                                                                                                  |
| **`OperationSubmit`**      | Submits the signed extrinsic and shows the status modal: in progress → success (auto-closing) or error (dispatch/submission failure).                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **`OperationBlocked`**     | The shared "this operation can't be prepared" screen, shown in place of a confirmation that never became ready. Takes a typed reason (network turned off, unreachable, busy or unresponsive node, fee estimation failed, no signatory, unusable signing path, invalid call data, internal) and renders the matching explanation naming the chain, plus only the remediations that fit it — try again, change node, open network settings, reload, close.                                                                                                                                                      |
| **`OperationMessageSign`** | The parallel flow for signing an off-chain message (not an extrinsic) — e.g. the address-book backend's auth challenge.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

## Related

- [`transfer`](../transfer/README.md) — its confirmation step (`OperationsConfirm/Transfer/ui/Confirmation.tsx`) is
  hosted here; the step's [unknown-recipient note](../transfer/README.md#unknown-recipient-warnings) is transfer's
  product behaviour, just rendered through this shell.
- [`multisig-operations`](../multisig-operations/README.md) — its Approve/Reject flow reuses `OperationsConfirm/common`
  sections (the operation-description field, the call-data section) rather than this feature's own per-type confirmation
  screens.
- Every other operation-producing feature (staking, governance, fellowship, proxy) supplies its own
  `OperationsConfirm/<Type>` and `OperationsValidation` entries, consumed the same way.

## An operation without an amount

Most confirmation screens lead with the amount the user is about to move. **Claim rewards** cannot: the call names an
(era, validator, page) and the runtime settles what that page owes at execution, so any figure shown beforehand is a
prediction that can differ from what lands. Its confirmation therefore states the _scope_ of the claim — how many
payouts, over how many eras, across how many validators — and validates only what is genuinely in question, which is
whether the payer can afford the fee.
