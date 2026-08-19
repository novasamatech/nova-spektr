# Call data execute

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-07-15

## Overview

Executes an **arbitrary extrinsic from its encoded call data**. A power user pastes (or builds) a hex-encoded call,
picks the chain and the account to run it from, and Spektr wraps it through the account's signing path, previews the
decoded arguments, and signs and submits it. It is the escape hatch for operations the dedicated flows do not cover —
including executing pending multisig call data that was shared out-of-band.

## Who can use it / when it applies

- Gated by the **`callData`** feature flag, and reached through the **Custom operations** dropdown in the sidebar. It is
  a modal, not a route.
- A chain is offered only when the chosen initiator has an account on it; changing the chain re-picks a compatible
  initiator automatically.
- The initiator is an account of the selected wallet; multisig and proxy routes are resolved by the shared signing-path
  machinery (the pasted call is wrapped in the necessary `asMulti` / `proxy` layers), and the signatory picker is hidden
  when the initiator is the only option.

## Providing the call data

Two input modes share one call-data field:

- **Paste** (default) — the user pastes a `0x…` hex string.
- **Build** — an extrinsic builder composes the call from a pallet/method form and pushes the resulting call data back
  into the field. A template can prefill the field and jump straight to Build so the user only tweaks arguments.

The call data must start with `0x` and **decode to a valid extrinsic** on the selected chain; a string that cannot be
decoded surfaces an "invalid call data" error on the field. The decoded arguments are shown so the user confirms what
they are about to sign rather than trusting an opaque blob.

## States / scenarios

The flow is **form → confirm → sign → submit**.

| State            | When it appears                            | What the user sees                                                           |
| ---------------- | ------------------------------------------ | ---------------------------------------------------------------------------- |
| Form             | Modal opened                               | Network, initiator/signatory, Paste/Build call-data input, decoded args, fee |
| Invalid input    | Empty, no `0x` prefix, or undecodable call | Inline field error; submit disabled                                          |
| Insufficient fee | Signatory cannot cover the fee             | Signatory field error; submit disabled                                       |
| Confirm          | "Continue" pressed                         | Chain, initiator/signatory, decoded call arguments, fee                      |
| Sign / Submit    | Confirmed                                  | Standard sign and submit screens                                             |

**Draft mode** turns the form into "compose a draft": no signatory or fee check is required and saving the draft
redirects to the Operations page.

The sign step listens to the app-wide sign result but **only advances to submit when this flow is itself at the signing
step** — a signature produced by a different operation never pushes call-data-execute forward.

## Related

- `features/signing-path` — resolves the multisig/proxy route and wraps the pasted call accordingly.
- `features/drafts` — the draft-mode binding and the Operations-page redirect.
- `features/operations/OperationSign`, `features/operations/OperationSubmit` — the shared sign and submit stages.
