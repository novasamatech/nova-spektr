# Flexible Operation Details

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-07-15

## Overview

Covers the **"Edit flexible multisig"** operation — replacing the controller of a flexible multisig (the multisig that
operates a proxied account) — in the [Operations view](../multisig-operations/README.md). On-chain the replacement is a
proxy swap; without dedicated presentation it would read as an anonymous `proxy: proxy` call. The operation exists in
**two execution variants** — **trusted** and **verified** — and the view presents each with its own card, tag, and
details.

The primary presentation (the bespoke card and its details panel, described below) is owned by the Operations view's
_Edit controller_ detector; this feature contributes the generic title/icon fallback for the same shape. Both are
specified here so the edit-flexible story lives in one place.

## The two edit variants

| Variant                   | On-chain shape                                       | What it means                                                                                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Trusted (atomic swap)** | `proxy.proxy( batchAll[ addProxy, removeProxy ] )`   | The new controller is added **and the old one removed in the same transaction**. Requires trusting that the new controller's keys are correct upfront — there is no proof step.                                                      |
| **Verified (add-only)**   | `proxy.proxy( batchAll[ addProxy, marker remark ] )` | **Only the new controller is added.** A `system.remark` marker in the batch records the outgoing controller. The old controller is removed later, after the new one proves access via a separate **verification operation** (below). |

Accepted wrapper variations: the inner batch may be `batch` / `batchAll` / `forceBatch`; `addProxyWithDelay` counts as
the add; and when the new controller's multisig is not known locally, the whole `proxy.proxy` may itself be wrapped in
an outer batch alongside a `system.remarkWithEvent` carrying new-controller metadata — the detector recurses into it. A
bare `addProxy` without the batch structure is a plain proxy addition, not an edit (see
[`proxy-operation-details`](../proxy-operation-details/README.md)).

## What the operation row shows

The edit operation renders as a bespoke card across the Operation and Value cells:

- **old → new** identicon pair for the outgoing and incoming controller accounts;
- title **"Edit flexible multisig"** with the chain name;
- a variant tag with an explanatory tooltip: **"Atomic swap"** (warning-colored — _"Old proxy is removed in the same
  transaction"_) for the trusted flow, or **"Verified swap"** (positive-colored — _"New proxy is added; the old one is
  removed later, after verification"_) for the verified flow.

No amount is displayed — the operation carries no value.

## Expanded Details panel

Added to the shared rows (depositor, date/time, description):

- **New proxy** — the address control is transferred to, resolved to a name. When the incoming controller is a known
  multisig candidate, its **threshold ("{n} of {m}") and signatory list** are shown under it.
- **Old proxy** — **trusted flow only**: the outgoing controller, with the same threshold/signatories enrichment when
  known. (In the verified flow the old controller stays in place until verification, so only the target is shown.)
- **Execution mode** — _"Trusted (atomic): old proxy will be removed in the same transaction."_ or _"Verified
  (add-only): old proxy will be removed later, after verification."_
- **Open proxy details** — opens the proxied wallet's details on its Proxies tab, when the proxied account belongs to a
  local wallet.

## The verification operation (verified flow, step 2)

In the verified flow the new controller must prove it can act for the proxied account before the old one is removed.
That proof is its own multisig operation — a ping
`proxy.proxy( real = pure proxy, system.remarkWithEvent( verify marker ) )`, built by the
[`proxy-verify`](../proxy-verify/README.md) flow and dispatched by the new controller through the pure proxy. Only proxy
types that can dispatch a remark are verifiable this way: **Any** and **NonTransfer**.

**The marker.** The `system.remarkWithEvent` body is a JSON payload
`{ kind: "verify-proxy", delegateAccountId, pureProxyAccountId, remark? }`:

- `kind` is the discriminator — an ordinary `remarkWithEvent` operation without it is never presented (or counted) as a
  verification.
- The `(delegate, pure proxy)` pair lets the executed operation be matched back to the exact proxy row being verified —
  without it, _any_ executed operation through that multisig + pure-proxy pair would flip the row to verified, a false
  positive for incidental operations.
- `remark` is optional user text shown in the details (older pings carry it under the legacy `memo` key — still
  accepted).
- On-chain the remark arrives hex-encoded; local builds keep the JSON string — both are parsed. A payload whose account
  ids don't decode is rejected, so a crafted remark can't render as a verification ping.
- The marker is accepted at any level — bare `remarkWithEvent`, proxy-wrapped, or inside a batch — because the
  multisig-operation domain often stores the core call with the proxy wrapper already stripped.

**Presentation** (the Operations view's _Verify proxy_ card):

- **Row** — title **"Verification for wallet"** with a **"Verification"** tag (tooltip: _"Signer is proving control of
  the proxied wallet via a marker remark"_).
- **Details** — **Verifying wallet** (the new controller whose access is being proven, named), the optional **Remark**
  text, and **Open wallet details** (the pure proxy wallet's Proxies tab, where the delegate's verification status is
  surfaced).

**Outcome.** When the ping executes, the wallet-details proxies model matches the emitted marker back to the
`(delegate, pure proxy)` row and marks that controller **verified** — unblocking the removal of the old one.

Note the two remark flavours are deliberately distinct: the **verify ping** uses `system.remarkWithEvent` (its execution
must be observable on-chain), while the **old-controller marker** inside the verified edit batch is a plain
`system.remark`; an outer `remarkWithEvent` next to the edit batch carries new-controller metadata only when the new
multisig isn't known locally, and the detectors never conflate the three.

## Fallback title and icon (this feature proper)

For the exact shape `proxy.proxy( batchAll[ addProxy, removeProxy ] )` this feature registers the generic row title
**"Edit flexible multisig"** and the delegated-authorities icon, and adds no Details rows of its own. In the operations
table it is effectively shadowed: the domain stores a flexible-multisig operation's call with the proxy wrapper already
stripped (so this detector's `proxy.proxy` requirement doesn't match), and the bespoke card claims the operation anyway.
Where it does surface is the other consumers of the shared title/icon transformers — **draft rows** and **multisig
notifications** — whose decoded calls keep the full wrapper.

## Related

- [`multisig-operations`](../multisig-operations/README.md) — owns the bespoke _Edit controller_ / _Verify proxy_ cards,
  their detectors, and the details panels described above.
- **`flexible-change-signatories`** — the flow that produces edit-flexible operations and chooses between the trusted
  and verified variants.
- [`proxy-verify`](../proxy-verify/README.md) — builds the verification ping.
- [`proxy-operation-details`](../proxy-operation-details/README.md) — plain (non-edit) proxy management operations.
