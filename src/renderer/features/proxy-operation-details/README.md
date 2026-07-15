# Proxy Operation Details

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-07-15

## Overview

Presents **proxy-management operations** — delegating and revoking on-chain authority — in the multisig
[Operations view](../multisig-operations/README.md): a human title and icon per proxy action and the delegation-specific
rows of the expanded Details panel.

## Who can use it / when it applies

Applies automatically to any multisig operation whose (core) call is one of the proxy actions:

| Call              | Row title                                 |
| ----------------- | ----------------------------------------- |
| add proxy         | "Add delegated authority (proxy)"         |
| remove proxy      | "Revoke delegated authority (proxy)"      |
| create pure proxy | "Create pure proxy"                       |
| kill pure proxy   | "Revoke delegated authority (pure proxy)" |

All proxy actions share the delegated-authorities icon; none displays an amount (proxy calls carry no value).

**Exception:** an operation recognized as a **proxy edit** — the
`proxy.proxy( utility.batchAll[ addProxy, removeProxy ] )` shape that swaps a flexible multisig's controller — is
deliberately left to the Operations view's bespoke _Edit controller_ card and its own details panel; this feature
contributes nothing for it.

## Expanded Details panel

Added to the shared rows, when the call carries the data:

| Row             | When                       | What it shows                                |
| --------------- | -------------------------- | -------------------------------------------- |
| **Delegate to** | add proxy                  | the account receiving authority, named       |
| **Revoke for**  | remove proxy               | the account losing authority, named          |
| **Revoke for**  | kill pure proxy            | the sender (the pure proxy being dissolved)  |
| **Access type** | add / remove / create pure | the proxy type (Any, Staking, Governance, …) |

## Supported wrappers

- **`proxy.proxy`** — for flexible multisigs the call is unwrapped before matching.
- **`utility.batchAll`** — not matched here; the add+remove pair is the proxy-edit shape handled by the bespoke card
  (see the exception above).

## Confirmation step

No contribution — the approve/sign confirmation shows only the shared operation summary for proxy operations.

## Related

- [`multisig-operations`](../multisig-operations/README.md) — hosts the row and the Details panel slot, and owns the
  bespoke _Edit controller_ / _Verify proxy_ cards that take precedence for their shapes.
- [`flexible-operation-details`](../flexible-operation-details/README.md) — fallback title/icon for the proxy-edit shape
  when the bespoke detectors do not claim it.
