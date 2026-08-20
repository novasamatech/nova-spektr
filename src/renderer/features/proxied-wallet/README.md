# Proxied Wallet

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-20
>
> **Draft — pending author review.** Written from reading the code; needs sign-off from the feature owner before it is
> treated as the source of product truth.

## Overview

A proxied wallet represents an on-chain account that somebody else is allowed to act **for**. The user does not hold its
key — they hold the key of a proxy account that the chain lets act on its behalf. This feature defines how such a wallet
appears, what it may do, and how any transaction the user builds for it gets wrapped into a `proxy.proxy` call before it
is signed by the proxy account.

Gated by the `proxy` feature flag.

## Who can use it / when it applies

Applies to accounts discovered as proxied — the user is shown wallets they have been _delegated_ rights over, which is
why the switcher group is labelled "Delegated to you (proxied)" rather than "Proxied".

A proxied wallet is only usable while the user still holds a proxy account for it. If that proxy is gone, the wallet is
still listed but nothing can be signed for it.

## States / scenarios

| Situation                      | Behaviour                                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| Any proxied account            | Cannot act **directly** — the account itself never signs; the proxy behind it does                  |
| Account's chain matches target | Available on that chain only — a proxy relationship is per chain                                    |
| Signing multiple transactions  | Never allowed                                                                                       |
| Building any transaction       | The call is wrapped in `proxy.proxy(real, proxyType, call)` and routed to the proxy account to sign |
| Call is outside the proxy type | Rejected before signing — an on-chain proxy is scoped (e.g. Staking, Governance) and the app checks |
|                                | the call against that scope rather than letting the chain reject it later                           |
| Account structure view         | Drawn as a "Proxied" node, with the proxy relationship labelled by its proxy type                   |

The switcher shows a "Delegated to you (proxied)" group with a tooltip explaining the delegation, searchable by wallet
name or any of the wallet's addresses, each row showing its live fiat balance.

## Lifecycle

1. A proxied wallet appears once account discovery finds an on-chain proxy relationship pointing at one of the user's
   accounts (or once the user creates a pure proxy — the feature watches for the chain's `PureCreated` event and works
   out the new pure account's identity from it).
2. Selecting it makes the app act "as" that account: balances and history are its own.
3. Any operation the user starts is wrapped as a proxy call and handed to the proxy account for signing, which may in
   turn be a multisig or another wallet type — the signing path is resolved per transaction, not fixed to the wallet.
4. Removing the proxy on chain (see `proxy-remove`) takes the wallet's usability away; discovery drops it on the next
   sync.

## Related

- `proxy-add`, `proxy-remove`, `proxy-verify` — managing proxy relationships on chain.
- `proxy-operation-details` — how a wrapped proxy call is presented for review and signing.
- [`multisig-wallet`](../multisig-wallet/README.md) — often the wallet that ends up signing on a proxied wallet's
  behalf.
