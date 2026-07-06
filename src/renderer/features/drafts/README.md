# Drafts

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-07-06

## Overview

A **draft** is a saved, shareable, not-yet-signed transaction. It captures everything needed to sign an operation
later: the target **network**, the **call data** (the encoded extrinsic — optional at first, can be filled in later), a
human **description**, and a pre-authored **signing path** describing exactly which accounts the transaction must route
through to reach its final signer.

Drafts solve the coordination problem inherent to **multisig and proxy operations**, which span multiple people and
time. A coordinator composes a transaction and persists it to the backend as a draft; a signatory who controls the leaf
signing key opens that same draft later and submits it. Because drafts live on the backend they are inherently
multi-user: shareable via a deep link (`Paths.OPERATIONS?draftId=…`), auto-fetched on sign-in, and re-polled every 30s —
so every client picks up others' add / update / remove changes and raises an in-app notification for them.

## Who can use it / when it applies

- **Creating** a draft requires being signed in to the backend and holding the draft-write permission
  (`useCanCreateDraft`). Available from a dedicated "Create Draft" modal, or implicitly from another transaction form
  running in *draft mode* (a transfer/staking/etc. form offers "Save as draft", seeding the create flow with its call
  data, chain, and signing path — see `createDraftModeBinding`).
- **Submitting** a draft requires being backend-authenticated, the draft having call data, and the user's wallet
  containing the draft's **multisig account**. This gate is `getDraftSubmitGate`. Whether the wallet also holds a usable
  signatory on the path is a separate, later check inside the submit flow (see *Initiator unavailable* / *No signatories*
  in States below).

Drafts surface in the Operations page and the dashboard operations queue.

## The signing path (route)

The signing path is the heart of the feature. A draft does not just say "sign this transaction" — it encodes the exact
**route** through the account topology: proxy hops, multisig hops, ending at a signer. This matters because one
transaction can be reachable by multiple routes, and signing through the wrong route wraps the call differently
(e.g. `proxy.proxy(real, call)` vs a bare multisig `as_multi`).

At submit time the saved path is resolved back into concrete accounts and **strictly followed** — the flow never
silently re-routes. The canonical initiator is the path's first node (important for nested multisigs, where the deepest
multisig is the leaf, not the root). The route drives extrinsic wrapping, the multisig threshold/deposit, and which
account balances get validated. **Legacy drafts** with an empty saved path fall back to automatic route discovery from
initiator to a chosen signatory — but only when no saved path exists.

## Create flow

A three-step wizard: **call data → select path → confirm**.

| Step          | What the user does                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------- |
| Call data     | Picks a network (defaults to Polkadot Asset Hub) and provides the extrinsic — paste hex, or build it. Can be **skipped** to author call data later. Undecodable data is blocked with an error. |
| Select path   | Authors the signing path using the shared `signing-path` graph. Drafts restrict sources and multisig hops to **address-book (backend contact) entries only**. A complete path ends in a signer node. |
| Confirm       | Reviews the operation and adds a required description (max 500 chars).                                          |

The wizard can **jump ahead** from a seed: chain + valid call data + complete path opens straight to *confirm*; chain +
call data only opens to *select path*. On save the client derives the multisig / initiator / proxy accounts from the
path and creates the draft. If the backend rejects an account as "not found", the UI shows a friendly "account not in
address book" message.

## Submit flow

A staged flow: **call data (conditional) → confirm → sign → submit**.

- **Call data** (only if the draft was saved without it): the submitter pastes call data, sees a decoded preview, and
  confirms; this patches the draft on the backend, then advances to confirm.
- **Confirm** — the core review screen. It shows:
  - the signing path as a breadcrumb (plus a review popover for paths of length ≥ 2);
  - a signatory selector when more than one valid signatory exists (auto-selected when only one);
  - wallet / account / signatory details, description, an external decode link, and expandable call args;
  - the **fee**, and the **multisig deposit** (with its own pending state) when the route contains a multisig;
  - **validation errors** from a balance-aware validator that checks every account that must pay along the route.

  The Sign button stays disabled until the wrapped extrinsic and fee are ready, validation passes, and the initiator is
  available.
- **Sign / Submit** — hands off to the shared `OperationSign` and `OperationSubmit` flows. On success it shows a
  success toast and records a backend operation description linking the draft to the resulting on-chain operation, so
  the multisig operation inherits the draft's description. A "Submitted" badge shows until the backend confirms.

## States / scenarios

| State | When it appears | What the user sees |
| ----- | --------------- | ------------------ |
| Path unresolvable | The saved path can't be re-resolved against the current wallets (e.g. a wallet on the route was removed) | The flow is **blocked** with a signing-path-unresolved error — never wrapped to the raw transaction |
| Extrinsic build failure | Wrapping the call fails | A generic extrinsic error (debounced ~300ms so transient init states don't flash red) |
| No signatories | The wallet holds no account that can sign | An empty-account warning, with an add-account affordance for Polkadot Vault |
| Initiator unavailable | The draft's stored initiator can no longer sign | A banner asking the user to pick a replacement signatory; signing disabled until they do |
| Undecodable / missing call data | Bad or absent call data at create or submit entry | Blocked with a clear hint |
| Post-submit sync failure | Recording the operation description fails after a successful on-chain submit | A toast with a **Retry** action; the draft stays visible and retryable |

## Lifecycle

1. **Create** — draft appears on the backend, local cache updates, success toast.
2. **Distribute** — visible to other backend users; deep link plus in-app notifications on add/update/remove (a client's
   own mutations are de-duplicated so it isn't notified of its own actions).
3. **Edit** — call data and description can be updated (notably the late-call-data path at submit time).
4. **Submit** — sign and broadcast; on success an operation description ties the draft to the resulting multisig
   operation.
5. **Delete** — drafts can be removed. Periodic backend polling keeps all connected clients' caches converged.

## Related

- **`signing-path`** — provides the path graph model, path node types, route resolution, validation, and the
  breadcrumb / review UI. Drafts are a persistence and coordination layer on top of it.
- **`OperationSign` / `OperationSubmit`** (shared operations) — the actual sign-and-broadcast machinery.
- **`multisig-operation-description`** aggregate — drafts carry their own description, so the submit flow suppresses the
  multisig flow's own description input and post-submit hook.
- **`backend` domain** — draft CRUD and cache, operation descriptions, auth, and permissions.
