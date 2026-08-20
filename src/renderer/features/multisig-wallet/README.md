# Multisig Wallet

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-20
>
> **Draft — pending author review.** Written from reading the code; needs sign-off from the feature owner before it is
> treated as the source of product truth.

## Overview

Defines how an existing multisig wallet behaves: where it can be used, who its signatories are, what it costs to start
an operation, and how a plain transaction the user builds becomes a `multisig.asMulti` call signed by one signatory.

Covers both kinds:

- **Multisig** — the classic account derived from a signatory set and a threshold.
- **Flexible multisig** — a pure proxy controlled by a multisig, so the signatory set can be changed later without the
  account address changing. Its calls are wrapped twice: as a proxy call for the pure account, then as a multisig call
  for the controlling multisig.

Gated by the `multisig` / `flexibleMultisig` feature flags.

## Who can use it / when it applies

A multisig wallet is usable on a chain only where the chain supports the multisig pallet; a flexible multisig
additionally needs pure-proxy support and only works on its own chain. This is why a multisig may be visible in the
switcher but unavailable on some networks.

## States / scenarios

| Situation                                   | Behaviour                                                                               |
| ------------------------------------------- | --------------------------------------------------------------------------------------- |
| Any multisig account                        | Cannot act directly — a signatory always signs on its behalf                            |
| Chain supports multisig                     | Classic multisig is available there                                                     |
| Chain supports multisig **and** pure proxy, | Flexible multisig is available there                                                    |
| and it is the account's own chain           |                                                                                         |
| Signing multiple transactions               | Never allowed                                                                           |
| Starting any operation                      | The signatory must hold the multisig **deposit** on top of the fee, otherwise the       |
|                                             | operation is blocked before signing with a clear "not enough for the deposit" reason    |
| Signatory is not a wallet the user has      | Still shown in the account structure, as a greyed-out "Signatory" placeholder node      |
| Account structure view                      | Multisig in green, flexible multisig in red-to-purple, each labelled with `threshold/n` |

The switcher shows one "Multisig" group holding both kinds, classic ones first, flexible ones after. Each row is
searchable by wallet name or any of the wallet's addresses, shows its live fiat balance, and a flexible multisig
additionally carries a "Flex" label (with its proxy type when it is narrower than `Any`) and its chain icon.

**Why the deposit is checked against the signatory, not the multisig.** The chain reserves the deposit from whoever
submits the first approval, so the balance that matters is the signatory's — checking the multisig's own balance would
let the user start an operation that then fails.

## Lifecycle

1. A multisig wallet enters the app either from [`multisig-wallet-create`](../multisig-wallet-create/README.md) or from
   account discovery finding an on-chain multisig the user is a signatory of.
2. Selecting it makes the app act as the multisig: balances and history are the multisig account's.
3. Any operation is wrapped as `multisig.asMulti` (for a flexible multisig, wrapped as a proxy call first) and routed to
   one of the user's signatory accounts to sign.
4. The resulting on-chain operation then lives in [`multisig-operations`](../multisig-operations/README.md) until it
   collects enough approvals to execute.
5. For a flexible multisig, the signatory set can be changed later via
   [`flexible-change-signatories`](../flexible-change-signatories/README.md) without the wallet's address changing.

## Related

- [`multisig-wallet-create`](../multisig-wallet-create/README.md) — creating a new multisig or flexible multisig.
- [`multisig-operations`](../multisig-operations/README.md) — the approval queue an operation lands in.
- [`flexible-change-signatories`](../flexible-change-signatories/README.md) — rotating a flexible multisig's
  signatories.
- [`proxied-wallet`](../proxied-wallet/README.md) — the proxy wrapping a flexible multisig reuses.
