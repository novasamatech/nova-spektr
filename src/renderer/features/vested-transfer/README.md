# Vested transfer

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-07-13

## Overview

Bulk creation of on-chain vesting schedules (`vesting.vestedTransfer`) from a **CSV file**. A treasury or ops user
uploads a table of recipients and lock parameters — team allocations, airdrops, crowdloan rewards — and Spektr validates
every row against the chain's own vesting rules, previews the result, and submits it as a single transaction (a
`utility.batchAll` once more than one call is produced).

CSV is the **only** input channel: there is no manual row-by-row entry. The feature exists because these payouts arrive
as spreadsheets, and a mistake in one row of a hundred is expensive and irreversible — so the emphasis is on catching
bad rows before signing, not on making a single transfer convenient.

It is the inverse of [`vesting-claim`](../vesting-claim/README.md), which is how the _recipient_ later releases what has
vested.

## Who can use it / when it applies

- Gated by the **`vestedTransfer`** feature flag, and reached through the **Custom operations** dropdown in the sidebar
  (itself behind `appCustomOperations`). It is a modal, not a route.
- A chain is offered only when it is **configured** as vested-transfer-capable and the selected wallet has an account on
  it. Capability is read from chain config, not probed from chain metadata — a mis-configured chain would fail rather
  than degrade gracefully.
- **Native asset only.** The initiator is an account of the selected wallet; multisig and proxy routes are resolved by
  the shared signing-path machinery, and the signatory picker is hidden when the initiator is the only option.

## The CSV contract

Required columns are `target`, `locked`, `starting_block`, `per_block`; `unlocked_at_start_block` is optional. The
`errors` and `warnings` columns are tolerated and ignored, so an annotated file downloaded from a failed run can be
fixed and re-uploaded directly. Amounts are **planks**, not decimal tokens. Limits: 1000 rows, 1 MB, 200 bytes per
record; `#` starts a comment line. An "Example" link downloads a template.

| Field                     | Meaning                                          | Rules                                                                                                                                                             |
| ------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `target`                  | Recipient address                                | Valid SS58. **Error** if the recipient's existing on-chain schedules plus the ones this file adds would exceed the chain's max; a repeated address is a _warning_ |
| `locked`                  | Total amount locked for the recipient            | At least the chain's minimum vested transfer; within range                                                                                                        |
| `starting_block`          | Block at which vesting starts                    | **Warning** (not an error) if it is already in the past — the pallet accepts it and the schedule simply starts out partly vested                                  |
| `per_block`               | Amount released per block after the start        | Must be positive and in range                                                                                                                                     |
| `unlocked_at_start_block` | **Cliff**: amount available immediately at start | At most `locked`, and both the cliff _and_ the remainder (`locked − cliff`) must each clear the chain's minimum vested transfer                                   |

The "current block" that `starting_block` is judged against is the **timeline chain's** — for a parachain that is the
relay chain's height, which is what the pallet itself uses. This is the single most common authoring mistake, hence the
explicit warning text.

A **cliff row becomes two on-chain schedules**: one that fully vests within a single block (the cliff, spendable at the
start block) and one linear schedule for the remainder. That is why a cliff row consumes **two** of the recipient's
schedule slots, and it is counted that way during validation.

Validation needs the chain's minimum vested transfer, its maximum schedules per account, the timeline chain's current
block, and **every existing vesting schedule on the chain** — the last of which is a full storage-map scan, performed
per chain selection.

## States / scenarios

The flow is **form → confirm → sign → submit**.

| State              | When it appears                           | What the user sees                                                                                                                      |
| ------------------ | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Form               | Modal opened                              | Network, signing path, CSV upload, derived total amount, fee (and multisig deposit on a multisig route)                                 |
| Empty CSV          | File parses but has no data rows          | Inline hint; preview disabled                                                                                                           |
| Malformed CSV      | Unknown/missing headers, unparseable file | Inline hint; preview disabled                                                                                                           |
| Rows with errors   | ≥1 row fails a rule                       | Red alert listing "Row N: …", with a download of the file annotated with an `errors` column. Blocks submit                              |
| Rows with warnings | ≥1 row raises a warning                   | Amber alert, same annotated download. Does **not** block submit                                                                         |
| Preview            | "Preview" clicked                         | The schedule table: recipient, locked, start block (with its resolved date), per block, and the cliff column only when some row has one |
| Confirm            | "Continue" pressed                        | Total amount + fiat, chain, initiator/signatory, the parsed-file preview row, fee, deposit, call data                                   |
| Sign / Submit      | Confirmed                                 | Standard sign and submit screens; closing mid-signing asks for confirmation                                                             |

Changing the network or uploading a new file **discards the parsed CSV and all row errors** — every rule depends on
chain constants, so nothing validated against the previous chain can be trusted.

Beyond the shared transaction validation, one rule is specific here: the initiator must be able to send the **sum of all
`locked` amounts** while staying above the existential deposit. The fee is computed from the real transaction once a
file is loaded; before that a two-schedule dummy is used purely so a plausible fee is visible early.

**Draft mode** turns the form into "compose a draft" instead of "sign now": the submit button becomes _Initiate_, no
signatory is required, and saving the draft redirects to the Operations page.

## How it appears elsewhere

- In **multisig operations**, a vested transfer awaiting approval is rendered by the (presentational)
  `vested-transfer-operation-details` module: the title and hero amount use the **summed** locked amount across the
  batch, and the details panel offers the same schedule preview table, rebuilt from the decoded call arguments. Proxy,
  multisig and `batchAll` wrappers are unwrapped first.
- One consequence for approvers: a cliff the author wrote as **one** CSV row appears as **two** schedules for that
  recipient, because the cliff is not recoverable from the on-chain arguments. The approver sees the on-chain truth, not
  the author's spreadsheet.

## Related

- [`vesting-claim`](../vesting-claim/README.md) — the recipient's side: seeing and claiming what has vested.
- `widgets/vesting-schedule-preview` — the one preview table shared by the form, the confirmation and the multisig
  details panel.
- `domains/vesting` — chain constants, existing-schedule lookup, and the error/warning vocabulary behind every CSV
  message.
- [`multisig-operations`](../multisig-operations/README.md) — where a vested transfer initiated by a multisig waits for
  its approvals.
