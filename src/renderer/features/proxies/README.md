# Proxies

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-09-29

## Overview

When an account in one of the user's wallets is discovered to be a proxy for another account, this feature creates a
watch-only **proxied wallet** for the delegating account, so the user can see it and act on its behalf through the
proxy. It also keeps those wallets in sync as proxy relationships change on-chain.

## States / scenarios

| Scenario                          | Behaviour                                                                                                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New proxied account found         | A proxied wallet with one watch-only account is created on the account's chain.                                                                                               |
| Wallet name                       | The on-chain identity of the proxied account (`name / sub-name`) is used; if there is no identity or it is empty, a name derived from the proxy relationship is used instead. |
| Controlled by a flexible multisig | The proxied wallet is created hidden, since it is already represented by the flexible multisig wallet.                                                                        |
| Proxy relationship updated        | The stored proxied accounts are updated.                                                                                                                                      |
| Proxy relationship removed        | The corresponding proxied wallets are removed.                                                                                                                                |

Identity names are normalised the same way as contact names (invisible formatting and control characters removed), so an
identity that is empty after normalisation falls back to the proxy-based name.

## Related

- `proxied-add-pure` — creates a proxied wallet for a newly created pure proxy.
- [`proxy-operation-details`](../proxy-operation-details/README.md) — details of operations signed through a proxy.
