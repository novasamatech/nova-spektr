# Extrinsic Builder

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-09-29

## Overview

A form that builds hex **call data** from runtime metadata instead of asking the user to paste it. The user picks a
pallet and a call; the builder renders one typed input per call argument (derived from the chain's metadata) and encodes
the values into call data whenever they change. It also runs the other way: given existing hex, it decodes it back into
pallet, call and field values so the form can be edited.

## Who can use it / when it applies

The builder is not a screen of its own. It is the **Build** tab next to the **Paste** tab wherever call data is entered:

- the [`call-data-execute`](../call-data-execute/README.md) form (execute / draft an operation),
- the [`drafts`](../drafts/README.md) transaction step.

It needs a connected API and the selected chain: without an API the pallet list is empty and nothing encodes; the chain
decides which unit amounts are entered in (see below). The host owns the call data value; the builder receives it as
`initialCallData` and reports changes through `onCallDataChange`.

## States / scenarios

| State              | When it appears                                               | What the user sees                                                                    |
| ------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Pallet selection   | Always                                                        | Filterable list of pallets that expose at least one call, sorted by name              |
| Call selection     | A pallet is chosen                                            | Filterable list of that pallet's calls; an info icon shows the call's docs            |
| Parameter inputs   | A call with arguments is chosen                               | One field per argument, labelled `name: TypeName` (plus "Balance"/"Account" hints)    |
| Restored from hex  | The host hands over hex that was not produced by this builder | Pallet, call and fields pre-filled from the decoded call; amounts shown in their unit |
| Encoding error     | The current values cannot be encoded                          | "Failed to encode call data. Check parameters." under the fields                      |
| Nested depth limit | A `Call`-typed argument is nested 3 levels deep               | A plain hex input with a note that nesting is limited to 3 levels                     |

Changing the pallet clears the call and all values; changing the call clears all values. Both clear any encoding error.

### Parameter input rules

Inputs are chosen by the resolved type of each argument:

- **Balance** — an unsigned integer whose **metadata type name** says it is a balance (`Balance`, `T::Balance`,
  `BalanceOf<T>`, `<T as Config>::Balance`, `AssetBalanceOf<T, I>`…), at the top level or as a nested struct / enum
  field. The shape alone (`Compact<u128>`, `u64`) never makes a balance: weights (`ref_time`, `proof_size`), timestamps
  and indices share it and stay plain integers. Names like `BalanceStatus` stay enums. The field's **unit** is resolved
  per call:
  - pallets whose amounts are always in the native token (`balances`, `staking`, `nominationPools`, `delegatedStaking`,
    `convictionVoting`, `democracy`, `referenda`, `treasury` except `spend`, `bounties`, `childBounties`, `vesting`,
    `proxy`, `multisig`, `identity`, `crowdloan`) → the chain's native token;
  - `assets` / `poolAssets` → the asset whose id equals the call's `id` argument in the chain's asset list; the unit
    follows the `id` as it is typed;
  - anything else (`foreignAssets`, XCM pallets, `assetConversion`, `treasury.spend`, unknown pallets, or an asset id
    not in the list) → **no unit**.

  With a unit, the field is entered in tokens with the unit's symbol alongside; it accepts **digits and at most one
  decimal point** — no sign, no separators, no exponent — and decimal places are **capped at the unit's precision** (a
  keystroke that would exceed it is refused rather than rescaled later). Below the field the resulting base-unit value
  is shown (`= 1500000 base units`). Without a unit, the field is labelled **base units** and accepts only whole digits;
  the value goes into the call data as typed. The integer part has no cap, since `u128` arguments may exceed the
  15-digit limit used by the transfer forms. A nested `Call` argument resolves its own unit from its own pallet.

- **Integers** (including `Compact<…>` integers without a balance name) — digits only. A leading minus is accepted
  **only for signed types** (`i8`…`i128`); unsigned fields refuse it.
- **Bool** — a switch.
- **String / bytes** — free text, placeholder `0x...`.
- **Account** — a combobox over the user's own accounts and address-book contacts, searchable by name or address (a full
  address in any SS58 prefix matches by account id); whatever is typed on blur is committed as the value. Contact rows
  are collapsed by account id (a local contact wins over a backend one with the same address) and keyed by source +
  contact id, never by the user-supplied name, so same-named contacts stay distinct rows.
- **Option** — a Some/None switch that reveals the inner field when enabled.
- **Enum** — a variant picker plus fields for the chosen variant.
- **Struct / Tuple / Vec** — nested fields; Vec items can be added and removed.
- **Call** — a nested pallet/call/fields builder (see the depth limit above).
- **Unresolved types** (resolution depth exceeded) — a free-text area labelled with the type name; values are converted
  by shape at encode time.

## Lifecycle

1. The user picks a pallet and call and fills the fields.
2. Each change schedules an encode (500 ms debounce). Balance strings, nested ones included, are converted to base units
   with the call's unit **strictly**: a malformed amount (sign, separator, excess decimals, a fraction where no unit is
   known) fails the encode instead of being silently stripped or rescaled. Enum, Option, Struct, Tuple and Vec values
   are converted recursively.
3. On success the hex is reported to the host and any error is cleared. On failure the error line is shown and the host
   is **not** called — it keeps the last successfully encoded call data.
4. A nested `Call` argument encodes on every change of its own fields and hands the result up as the outer argument's
   value. If the nested call fails to encode it hands up **null**, so the outer call fails to encode too instead of
   carrying stale nested hex.
5. When the host supplies hex the builder did not produce itself (switching from the Paste tab, returning from Confirm),
   the builder decodes it and pre-fills the form. Amounts, nested ones included, are shown in the unit resolved for the
   decoded call — the same resolution the encoder uses — at full precision, so hex → form → hex is unchanged. Hex that
   cannot be decoded leaves the form as is.

## Related

- [`call-data-execute`](../call-data-execute/README.md) — hosts the Build tab; call data is only taken from the builder
  while that tab is active.
- [`drafts`](../drafts/README.md) — hosts the same builder in the draft transaction step.
- `operation-templates` — can replace the call data regardless of the active tab; the builder then re-decodes it.
