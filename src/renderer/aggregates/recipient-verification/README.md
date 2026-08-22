# Recipient Verification

> Part of the [Feature Map](../../features/README.md) — Last reviewed: 2026-08-20

## Overview

Transfers are irreversible, so sending to the wrong address is costly. This aggregate warns the user when a transfer or
multisig-operation recipient is **not a known address** — not in the address book and not one of the user's own accounts
— so an unknown destination is never mistaken for a familiar one.

The feature has no UI of its own and exists only in the context of the **external address book** (the backend contacts
connection): a user who has never connected it sees no change in behaviour at all. It exposes a mode and a resolver;
consuming features render the warning through shared components (`UnknownRecipientBadge`, `UnknownRecipientAlert`,
`UnknownRecipientAckBox` in `shared/ui-entities`).

## Modes

| Mode           | Condition                                                            | Behaviour                                                                                                                                                                                                                                                         |
| -------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `off`          | The address book was never connected, or was explicitly disconnected | The feature is entirely invisible — no badges, no alerts, no gates. Disconnecting (clearing the backend URL) resets to this mode even after past use.                                                                                                             |
| `unverifiable` | Connected before, but the connection is currently unhealthy          | Nothing can be verified, so **every** recipient shows the warning, with "cannot verify — reconnect" copy (reconnecting itself lives in the address-book surfaces). Acknowledgement checkboxes still gate submission, with "I verified the address manually" copy. |
| `active`       | Connected and healthy                                                | Only recipients that are **not known** (see below) show the warning.                                                                                                                                                                                              |

"Healthy" mirrors the same auth signal the backend aggregate uses elsewhere: authenticated, session not expired, no
network issue.

## What "known" means

In `active` mode, a recipient is known — and never warned about — when its `AccountId` is in the union of:

- backend (synced) contacts,
- local contacts,
- accounts belonging to any of the user's own local wallets.

Comparison is always by `AccountId` (public key), never by the SS58-encoded address string, so the same key is
recognized across chains that encode it differently.

**Deliberate divergence from the description feature.** Unlike `multisig-operation-description`, where a contacts
sync-error would make a write to the address book fail and so counts as unhealthy, a contacts sync error does **not**
flip this mode to `unverifiable`. A stale contact list is still useful for read-only recipient verification — the risk
of warning about a since-added contact is lower than the cost of silencing every warning whenever a sync hiccups.

## Consuming surfaces

- **Transfer form + confirmation step** (`features/transfer`) — an acknowledgement gate on the form, a passive note on
  the confirm screen. See
  [Transfer's "Unknown recipient warnings"](../../features/transfer/README.md#unknown-recipient-warnings).
- **Multisig operations list + expanded details** (`features/multisig-operations`,
  `features/transfer-operation-details`) — a row pill and a review alert, both informational only. See
  [Multisig Operations](../../features/multisig-operations/README.md#unknown-recipient-warnings) and
  [Transfer Operation Details](../../features/transfer-operation-details/README.md#unknown-recipient-warnings).
- **Multisig approve dialog** (`features/multisig-operations`) — a badge plus an acknowledgement gate on Sign. The
  informational badge also shows in the shared Reject dialog, but the acknowledgement gate is approve-only (rejecting is
  always the safe action).
- **Draft create + submit confirms** (`features/drafts`) — an acknowledgement gate on both confirm steps (Create and
  Sign), plus a Recipient row on the submit confirm. See
  [Drafts' "Unknown recipient warnings"](../../features/drafts/README.md#unknown-recipient-warnings).

Not yet wired up (cheap to add given the shared resolver): multi-transfer, vested transfer, teleport, and the
send-to-contact prefill flow (its recipient already came from the address book, so it is known by construction).

## Related

- **Backend aggregate** (`aggregates/backend`) — owns the connection/auth health signals this feature's `off` /
  `unverifiable` / `active` mode is derived from.
- **Contacts** (`entities/contact`) — source of the local + backend contact lists that make up "known" recipients.
- [`multisig-operation-description`](../multisig-operation-description/README.md) — the sibling aggregate that also
  reads address-book health, with the contrasting sync-error rule noted above.
