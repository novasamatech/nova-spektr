# Multi-transfer

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-07-31

## Overview

Sends the **native token to many recipients at once** from a single CSV file. An ops or treasury user uploads a table of
address/amount pairs — payouts, reimbursements, airdrops — and Spektr validates every row, previews the result, and
submits it as one transaction (a `utility.batchAll` once more than one transfer is produced).

CSV is the **only** input channel: there is no manual row-by-row entry. The feature exists because these payouts arrive
as spreadsheets and a mistake in one row of a hundred is expensive, so the emphasis is on catching bad rows before
signing. It is the plain-transfer counterpart of [`vested-transfer`](../vested-transfer/README.md), which instead
creates locked vesting schedules from a CSV.

## Who can use it / when it applies

- Gated by the **`multiTransfer`** feature flag, and reached through the **Custom operations** dropdown in the sidebar.
  It is a modal, not a route.
- A chain is offered only when it is **configured** as multi-transfer-capable (`ChainOptions.MULTI_TRANSFER`) and the
  selected wallet has an account on it.
- **Native asset only.** The initiator is an account of the selected wallet; multisig and proxy routes are resolved by
  the shared signing-path machinery, and the signatory picker is hidden when the initiator is the only option.

## The CSV contract

Required columns are `recipient` and `amount`; `#` starts a comment line. Amounts are **planks**, not decimal tokens.
Limits: 1000 rows and 1 MB. Uploading a new file or changing the network **discards the parsed CSV and every row
issue**, because each rule depends on chain constants and nothing validated against the previous chain can be trusted.

| Field       | Meaning           | Rules                                                                                                   |
| ----------- | ----------------- | ------------------------------------------------------------------------------------------------------- |
| `recipient` | Recipient address | Valid SS58 for the chain; a repeated address is a **warning**, not an error                             |
| `amount`    | Amount to send    | Positive and within range; each recipient must stay above the existential deposit after receiving funds |

Row issues carry a severity: **errors block submit**, **warnings do not**. Recipient existential-deposit checks need the
recipients' current balances, so the feature subscribes to them after parsing and re-validates once they arrive — an ED
warning can therefore appear a moment after upload.

Beyond the per-row rules, one whole-file rule applies: the initiator must be able to send the **sum of all amounts**
while staying above its own existential deposit (a keep-alive withdrawal). The fee is computed from the real transaction
once a file is loaded; before that a two-transfer dummy gives a plausible early estimate.

## States / scenarios

The flow is **form → confirm → sign → submit**.

| State              | When it appears                          | What the user sees                                                                  |
| ------------------ | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| Form               | Modal opened                             | Network, signing path, CSV upload, derived total amount, fee (and multisig deposit) |
| Empty / malformed  | File parses to no rows, or bad headers   | Inline error; submit disabled                                                       |
| Rows with errors   | ≥1 row fails a rule                      | Alert listing the failing rows; blocks submit                                       |
| Rows with warnings | ≥1 row raises a warning (e.g. duplicate) | Amber alert; does **not** block submit                                              |
| Confirm            | "Continue" pressed                       | Total amount + fiat, chain, initiator/signatory, fee, multisig deposit, call data   |
| Sign / Submit      | Confirmed                                | Standard sign and submit screens                                                    |

**Draft mode** turns the form into "compose a draft" instead of "sign now": no signatory is required, the transaction is
built from the draft signing-path's source account, and saving the draft redirects to the Operations page.

The sign step listens to the app-wide sign result but **only advances to submit when this flow is itself at the signing
step** — a signature produced by a different operation never pushes multi-transfer forward.

## Related

- [`vested-transfer`](../vested-transfer/README.md) — the vesting-schedule counterpart, same CSV-first shape.
- `features/signing-path` — resolves the multisig/proxy route between initiator and signatory.
- `features/drafts` — the draft-mode binding and the Operations-page redirect.
- `features/assets-balances` — recipient and signatory balance subscriptions the validation builds on.
