# Extrinsic Builder

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-28

## Overview

A form that builds hex **call data** from runtime metadata instead of asking the user to paste it. The user picks a
pallet and a call; the builder renders one typed input per call argument (derived from the chain's metadata) and encodes
the values into call data whenever they change. It also runs the other way: given existing hex, it decodes it back into
pallet, call and field values so the form can be edited.

## Who can use it / when it applies

The builder is not a screen of its own. It is the **Build** tab next to the **Paste** tab wherever call data is entered:

- the [`call-data-execute`](../call-data-execute/README.md) form (execute / draft an operation),
- the [`drafts`](../drafts/README.md) transaction step.

It needs a connected API for the selected chain: without one the pallet list is empty and nothing encodes. The host owns
the call data value; the builder receives it as `initialCallData` and reports changes through `onCallDataChange`.

## States / scenarios

| State              | When it appears                                               | What the user sees                                                                 |
| ------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Pallet selection   | Always                                                        | Filterable list of pallets that expose at least one call, sorted by name           |
| Call selection     | A pallet is chosen                                            | Filterable list of that pallet's calls; an info icon shows the call's docs         |
| Parameter inputs   | A call with arguments is chosen                               | One field per argument, labelled `name: TypeName` (plus "Balance"/"Account" hints) |
| Restored from hex  | The host hands over hex that was not produced by this builder | Pallet, call and fields pre-filled from the decoded call; balances shown in tokens |
| Encoding error     | The current values cannot be encoded                          | "Failed to encode call data. Check parameters." under the fields                   |
| Nested depth limit | A `Call`-typed argument is nested 3 levels deep               | A plain hex input with a note that nesting is limited to 3 levels                  |

Changing the pallet clears the call and all values; changing the call clears all values. Both clear any encoding error.

### Parameter input rules

Inputs are chosen by the resolved type of each argument:

- **Balance** (`Compact<u128>`/`Compact<u64>`, or a `u128`/`u64` whose metadata name mentions balance/amount/value) — a
  text field entered in whole tokens, with the chain's token symbol shown alongside. It accepts **digits and at most one
  decimal point** — no sign, no separators, no exponent. Decimal places are **capped at the chain's precision**: a
  keystroke that would exceed it is refused rather than accepted and rescaled later. The integer part has no cap, since
  `u128` arguments may exceed the 15-digit limit used by the transfer forms.
- **Integers** — digits only. A leading minus is accepted **only for signed types** (`i8`…`i128`); unsigned fields
  refuse it.
- **Bool** — a switch.
- **String / bytes** — free text, placeholder `0x...`.
- **Account** — a combobox over the user's own accounts and address-book contacts, searchable by name or address (a full
  address in any SS58 prefix matches by account id); whatever is typed on blur is committed as the value.
- **Option** — a Some/None switch that reveals the inner field when enabled.
- **Enum** — a variant picker plus fields for the chosen variant.
- **Struct / Tuple / Vec** — nested fields; Vec items can be added and removed.
- **Call** — a nested pallet/call/fields builder (see the depth limit above).
- **Unresolved types** (resolution depth exceeded) — a free-text area labelled with the type name; values are converted
  by shape at encode time.

## Lifecycle

1. The user picks a pallet and call and fills the fields.
2. Each change schedules an encode (500 ms debounce). Balance strings are converted from tokens to planck **strictly**:
   a malformed amount (sign, separator, excess decimals) fails the encode instead of being silently stripped or
   rescaled. Enum, Option, Struct, Tuple and Vec values are converted recursively.
3. On success the hex is reported to the host and any error is cleared. On failure the error line is shown and the host
   is **not** called — it keeps the last successfully encoded call data.
4. A nested `Call` argument encodes on every change of its own fields and hands the result up as the outer argument's
   value. If the nested call fails to encode it hands up **null**, so the outer call fails to encode too instead of
   carrying stale nested hex.
5. When the host supplies hex the builder did not produce itself (switching from the Paste tab, returning from Confirm),
   the builder decodes it and pre-fills the form; balance arguments are shown in tokens at full precision. Hex that
   cannot be decoded leaves the form as is.

## Related

- [`call-data-execute`](../call-data-execute/README.md) — hosts the Build tab; call data is only taken from the builder
  while that tab is active.
- [`drafts`](../drafts/README.md) — hosts the same builder in the draft transaction step.
- `operation-templates` — can replace the call data regardless of the active tab; the builder then re-decodes it.
