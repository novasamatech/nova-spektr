# Multi Transfer Operation Details

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-07-15

## Overview

Presents a **multi transfer** — a `utility.batchAll` consisting entirely of native transfers, the shape produced by
Spektr's CSV-driven multi-transfer flow — in the multisig [Operations view](../multisig-operations/README.md): the row's
title, icon and summed amount, a per-recipient preview in the expanded Details panel, and the total-amount block on the
approve/sign confirmation step.

## Who can use it / when it applies

Applies automatically to any multisig operation whose (core) call is a `utility.batchAll` where **every** inner call is
a plain native `transfer` (one or more). A batch mixing transfers with anything else is not a multi transfer and falls
through to the generic presentation.

## What the operation row shows

- **Title** — "Multi Transfer", with the source chain name as the subtitle.
- **Icon** — the multi-transfer icon.
- **Value** — the **sum** of all inner transfer amounts, in the chain's **native asset**.

## Expanded Details panel

One row is added to the shared rows: **Parsed file** with a **Preview** button. It opens a modal listing every transfer
of the batch in a table — row number, **Recipient** (resolved to a name) and **Amount** (with fiat value and a
raw-planks tooltip) — paged by 50 with a "Show more" control. The same preview component serves the CSV-import flow; in
this read-only context it shows no validation issues or download action.

## Confirmation step

On the approve/sign flow the feature contributes the centered **total amount block** (native asset, with fiat value).
Note: this block matches the raw transaction only — a proxy-wrapped multi transfer shows no amount here.

## Supported wrappers

- **`utility.batchAll`** — the matched shape itself (transfers only, inspected directly).
- **`proxy.proxy`** — for flexible multisigs the call is unwrapped before matching in the row title, icon, and Details
  panel (but not on the confirmation step, see above).

## Related

- [`multisig-operations`](../multisig-operations/README.md) — hosts the row, the Details panel slot, and the
  confirmation step this feature injects into.
- [`transfer-operation-details`](../transfer-operation-details/README.md) — single-transfer counterpart; note the asset
  difference: multi transfer always presents the native asset, single transfers resolve the asset from the call's asset
  id.
