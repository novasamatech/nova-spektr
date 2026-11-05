# Assets balances

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-11-05

## Overview

Keeps account balances current for every screen that shows or spends them. The module owns three things: the balance
subscription model (`balanceSubModel`) — which accounts are watched on which chains, and how missed requests are
recovered — the `useBalanceCoverage` readiness hook, and the shared `AmountInput` that every amount-entering form
renders.

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

## Balance coverage

`useBalanceCoverage(accountIds)` answers "have the balances of this whole selection arrived?" for views that must not
present a partial or empty picture as final. A record is written for every (account, chain, asset) pair a fetch queries,
zero balances included, so an account with no record on a chain has not been read there yet.

Coverage is counted **per (account, chain)**: an account is covered once it has at least one record on **every connected
chain** it is requested on. One chain answering does not stand in for the others — a selection whose relay chain
balances arrived is still incomplete while a connected parachain has not answered for it.

| Situation                                                                       | Result                                                                           |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Some selected account has no record yet on a connected chain it is requested on | Not complete; the account counts as awaiting                                     |
| Every selected account has a record on every such chain                         | Complete                                                                         |
| A chain of the selection is connecting                                          | Not waited for; reported as **syncing** until it connects, then it is waited for |
| A chain of the selection is disconnected or failing                             | Not waited for and not reported — it may stay down indefinitely                  |
| An account's only chains are still connecting                                   | Not waited for; reported as syncing                                              |
| A chain has no assets                                                           | Never waited for — there is nothing a record could be written for                |
| An account fits no enabled chain (no availability / no matching scheme)         | Not waited for — it is never requested                                           |
| A chain has a disabled connection                                               | Ignored — it never connects, so nothing is fetched; not syncing either           |
| No selected account has any record (e.g. chains not loaded yet)                 | Not complete                                                                     |
| 30s pass since the selection was set and it is still not complete               | Timed out — the view renders what it has; the missing accounts are counted       |
| A chain of the selection connects or drops                                      | The 30s wait starts again: a chain only just asked is syncing, not missing       |

A selected key's wallet accounts count on the chains they are available on — every one of them in a visible wallet, so a
key that exists as several accounts (per-chain WalletConnect accounts, Vault chain accounts of one key, the same key in
two wallets) is awaited on the chains of all of them; a hidden wallet's accounts are never fetched, so never awaited.
Other ids (contacts) count on every chain of a matching address scheme. The accounts come from `getEntryAccounts`
(`aggregates/account-presets`), the same function the dashboard requests their balances through, so the two cannot drift
apart.

Records kept from the previous session count like any other record: they are the cache the views render from, so a chain
whose balances are already stored is covered the moment it connects.

The hook reports what a view shows, so every view reads it the same way:

- `ready` — the view may leave its loading state. It turns on the first time the selection is complete or its wait runs
  out, and stays on for as long as the selection stays the same. A chain that connects later puts accounts back on the
  awaited list, but it does not take `ready` back — a view that has shown its content does not fall back to a skeleton.
  A new selection starts over, and so does coming back to an earlier one.
- `syncing` — "Syncing balances...": a chain of the selection is connecting, or accounts are awaited on a connected
  chain and the wait has not run out.
- `missingCount` — "Balances of N accounts have not loaded yet": the accounts still awaited once the wait has run out;
  zero while it runs.

The wait is keyed by the selection **and** the connected chains it is requested on. Whenever that set changes — a chain
connects or drops — the 30s start again, so a chain that has only just been asked shows as syncing, not as missing.

A balance update that does not change the answer does not re-render through the hook, and neither does a status change
of a chain the selection is not requested on. That is a property of the hook only: a view that also reads the balance
map itself — both dashboard widgets do, for their rows and totals — still re-renders on every balance update.

## Related

- `dashboard-accounts-table`, `dashboard-portfolio-overview` — one-shot fetches for the dashboard's account filter;
  readiness via `useBalanceCoverage`.
- `staking-amount-flow`, `staking-confirm-flow`, `staking-new-position-flow`, `multi-transfer`, `vested-transfer` —
  re-request the signing route's balances before validation.
- `@/shared/transactions` `createTxValidator` — the fee check that reads what this module fetched.
