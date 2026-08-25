# Assets balances

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-25

## Overview

Keeps account balances current for every screen that shows or spends them. The module owns two things: the balance
subscription model (`balanceSubModel`) — which accounts are watched on which chains, and how missed requests are
recovered — and the shared `AmountInput` that every amount-entering form renders.

## Who can use it / when it applies

Every feature that needs a balance calls in here rather than subscribing on its own. Two entry points exist and they are
not interchangeable:

- **Live subscription** — the selected wallet. Its accounts are subscribed on every chain they can live on, and the
  subscription follows the wallet switch, chain connects/disconnects and account changes.
- **One-shot fetch** — anything outside the selected wallet: the dashboard's "All wallets" account filter, a contact,
  the other hops of a signing route (a multisig, a proxy, a signatory from another wallet). Callers pass wallet accounts
  to `fetchAccounts` or raw `(accountId, chain)` pairs to `fetchAccountIds`.

## States / scenarios

| Situation                                         | Behaviour                                                                                                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Selected wallet changes                           | The previous wallet's subscriptions are dropped, the new wallet's accounts are subscribed on every chain they fit                                                               |
| A chain disconnects                               | Its live subscriptions are released; the intention is kept, so they come back on reconnect                                                                                      |
| A one-shot fetch on a connected chain             | Fetched immediately                                                                                                                                                             |
| A one-shot fetch on a chain that is not connected | **Deferred, not dropped.** The request is remembered per chain and replayed once that chain connects, so a balance asked for while a testnet was still connecting still arrives |
| The same account requested twice while deferred   | Remembered once                                                                                                                                                                 |

**Why deferral matters.** A signing flow validates the fee against the payer's balance. For an account outside the
selected wallet that balance exists only because somebody asked for it once — and if the chain was offline at that
moment, the ask used to vanish. The flow then failed its fee check with "this operation could not be checked", although
nothing was wrong with the operation. Staking flows additionally re-request the balances of every account on the signing
route when the route resolves, so the payer's balance is asked for at the moment it is needed.

## Related

- `dashboard-accounts-table`, `dashboard-portfolio-overview` — one-shot fetches for the dashboard's account filter.
- `staking-amount-flow`, `staking-confirm-flow`, `staking-new-position-flow`, `multi-transfer`, `vested-transfer` —
  re-request the signing route's balances before validation.
- `@/shared/transactions` `createTxValidator` — the fee check that reads what this module fetched.
