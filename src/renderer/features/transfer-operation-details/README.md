# Transfer Operation Details

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-07-17

## Overview

Presents **token transfer operations** — same-chain and cross-chain (XCM) — in the multisig
[Operations view](../multisig-operations/README.md): the row's title, icon and amount, the transfer-specific rows of the
expanded Details panel, and the amount block on the approve/sign confirmation step. Without it a transfer would render
as a raw `section: method` line with no recipient or route information.

## Who can use it / when it applies

Applies automatically to any multisig operation whose (core) call is:

- a **direct transfer** — native transfer, transfer-all, Asset Hub asset transfer, or ORML token transfer;
- a **cross-chain transfer** — any of the supported XCM flavours (teleport, limited/reserve transfer, `xTokens`
  transfers, `transfer_assets_using_type_and_then`, …).

## What the operation row shows

- **Title** — "Transfer", "Transfer All", or "Cross-chain transfer". Shown when the transferred asset can be resolved
  from the call's asset id; otherwise the row falls back to the generic `section: method` title.
- **Subtitle** — the source chain name; a cross-chain transfer shows the **from → to** chain pair instead.
- **Icon** — the transfer icon, or the cross-chain icon for XCM.
- **Value** — the transferred amount in the resolved asset. Transfer-all shows no amount (the final amount is only known
  at execution).

## Expanded Details panel

Added to the shared rows (depositor, date/time, description):

| Row              | When                          | What it shows                             |
| ---------------- | ----------------------------- | ----------------------------------------- |
| **Recipient**    | the destination is resolvable | the recipient account, resolved to a name |
| **Sender**       | XCM only                      | the sending account                       |
| **From network** | XCM only                      | the source chain                          |
| **To network**   | XCM only                      | the destination chain                     |

## Confirmation step

On the approve/sign flow the feature contributes the centered **amount block** — the transferred amount with its fiat
value — when the operation is a transfer with a resolvable asset and amount.

## Unknown recipient warnings

When the resolved recipient carries a warning from
[`recipient-verification`](../../aggregates/recipient-verification/README.md) (gated on the external address book
connection), the Details panel shows an amber **review alert** directly under the Recipient row, asking co-signers to
confirm the address with each other before approving — once the threshold is met the transfer is irreversible. It is
informational only; the acknowledgement gate that blocks signing lives in
[`multisig-operations`](../multisig-operations/README.md#unknown-recipient-warnings)' Approve dialog, not here.

## Supported wrappers

- **`proxy.proxy`** — for flexible multisigs the call is unwrapped before matching, so a proxy-routed transfer is
  recognized and presented as a plain transfer.
- **`utility.batchAll`** — not handled here; a batch of transfers is presented by
  [`multi-transfer-operation-details`](../multi-transfer-operation-details/README.md).

## Related

- [`multisig-operations`](../multisig-operations/README.md) — hosts the row, the Details panel slot, and the
  confirmation step this feature injects into.
- [`recipient-verification`](../../aggregates/recipient-verification/README.md) — decides whether the recipient is
  "known" and drives the review alert above.
- [`multi-transfer-operation-details`](../multi-transfer-operation-details/README.md) — the batch counterpart.
