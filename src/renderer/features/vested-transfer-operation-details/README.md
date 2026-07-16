# Vested Transfer Operation Details

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-07-15

## Overview

Presents a **vested transfer** — a transfer whose amount unlocks gradually over blocks — in the multisig
[Operations view](../multisig-operations/README.md): the row's title, icon and amount, a vesting-schedule preview in the
expanded Details panel, and the amount block on the approve/sign confirmation step.

## Who can use it / when it applies

Applies automatically to any multisig operation whose (core) call is:

- a single `vesting.vestedTransfer`, or
- a **`utility.batchAll` of `vestedTransfer` calls** — the shape Spektr's vested-transfer form emits whenever more than
  one call is needed: multiple recipients/schedule entries, or a single schedule with a **cliff** (an amount unlocked at
  the start block), which is encoded as two calls — the immediate unlock plus the remaining vesting.

## What the operation row shows

- **Title** — "Vested transfer", with the source chain name as the subtitle.
- **Icon** — the vested-transfer icon.
- **Value** — the locked amount in the chain's **native asset**; for a batch, the **sum** over all entries (so a cliff
  transfer shows its full amount, not just one leg).

## Expanded Details panel

One row is added to the shared rows: **Parsed file** with a **Preview** button. It opens a modal listing every schedule
entry in a table — row number, **Recipient**, **Locked** (total locked amount, with fiat and raw-planks tooltip),
**Start block** (with a starts-on date/time tooltip once the block timestamp resolves; timeline chain used when the
chain defines one), and **Per block** (tokens released per block). Paged by 50 with "Show more". A cliff arrives as two
schedule rows (the immediate-unlock leg and the remaining vesting) — the dedicated "Unlocked at start" column of this
preview component appears only in the CSV-import flow, which supplies that field.

## Confirmation step

On the approve/sign flow the feature contributes the centered **amount block** — the total locked amount (summed over
batch entries) in the native asset, with fiat value. It renders only for vested-transfer operations.

## Supported wrappers

- **`utility.batchAll`** — recognized whenever the batch's representative inner call is a `vestedTransfer`; title, icon,
  details and amounts all match through the batch.
- **`proxy.proxy`** — for flexible multisigs the call is unwrapped before matching everywhere, including the
  confirmation amount block.

## Related

- [`multisig-operations`](../multisig-operations/README.md) — hosts the row, the Details panel slot, and the
  confirmation step this feature injects into.
- **`vested-transfer`** (form feature) — produces these operations; its builder decides between the single-call and
  batch shapes described above.
