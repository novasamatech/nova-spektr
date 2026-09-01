# Governance

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-09-01

## Overview

The OpenGov surface of the app: the referendum list and its filters, the referendum details modal with voting, the
delegation views and the conviction-lock summary — everything the Governance page is assembled from. It answers, for one
chain at a time, _what is being decided, how did I vote, what does it cost me and what can I do about it_.

A vote is not free: it locks tokens for a period set by the conviction, and only the winning side keeps paying after the
referendum ends. So the feature always shows the lock next to the vote, and the way out (remove the vote, unlock) next
to the lock.

## Who can use it / when it applies

- Gated by the **`governance`** feature flag.
- Works on **one chain at a time**: a single, global network selector picks it, and every list, subscription and modal
  reads that selection. The choice is sticky for the session and is put back to the chain's default when nothing valid
  is selected. Chains without governance support never appear in the selector.
- Acts for the **selected wallet**: votes, delegations and unlocks are built for that wallet's accounts on the selected
  chain. A wallet with no account on the chain sees the referenda but cannot vote; a watch-only wallet sees its locks
  but cannot release them. A proxied account votes only through a proxy that is allowed to.
- Off-chain data (titles, descriptions, delegate registry) is fetched from a configured source and is optional — a
  referendum with no fetched title is still listed by its id.

## States / scenarios

| Surface            | State                       | What the user sees                                                                                                                                                             |
| ------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Referendum list    | Loading                     | Skeleton rows until the chain's referenda and the wallet's votes arrive                                                                                                        |
| Referendum list    | Ongoing / Completed         | Two groups; each row carries track, title, voting status badge and the wallet's own vote where it exists                                                                       |
| Referendum list    | Filtered                    | Search over title and id, track filter, voted / not-voted filter; an empty result says so, and the filters can be reset                                                        |
| Referendum details | Ongoing, wallet can vote    | Proposal, voting status with **Vote** (or **Revote** / **Remove vote** once voted), summary, timeline, links                                                                   |
| Referendum details | Ongoing, wallet cannot vote | The same, with the reason under the button: no account on this chain, a proxy without voting rights, or the whole balance delegated                                            |
| Referendum details | Completed                   | The same without actions; vote modals opened earlier close on completion                                                                                                       |
| Referendum details | Opened outside the page     | A host may add a chain badge to the title and a "Voting as _wallet_" line under the button — the dashboard does, because its own account selection is not what a vote acts for |
| Locks              | Some lock claimable         | Total locked, claimable now, pending with estimated dates, and an **Unlock** that batches every `remove vote` + `unlock` the release needs                                     |
| Locks              | Nothing claimable           | The same figures, Unlock disabled                                                                                                                                              |
| Delegations        | Delegating                  | Per-track delegations with the delegate's identity from the registry, and the total delegated                                                                                  |

**Selected chain drives everything.** Switching chain re-subscribes the list, the votes and the locks; leaving the page
closes those subscriptions. Another surface that borrows the selector (the dashboard's referendum modal) must select
first and restore afterwards, since the selection is global state, not a parameter.

## Lifecycle

Entering the page opens the governance flow: the selected chain's referenda, the selected wallet's votes on them and its
class locks are subscribed, titles and descriptions are requested off-chain, and the list is rendered from the merged
result. Opening a referendum subscribes its details (tally, timeline, proposer identity); voting goes through the app's
standard confirm → sign → submit stack, and a landed vote shows up in the list from the live subscription, not from a
manual refresh. Leaving the page unsubscribes everything.

Failures degrade rather than block: a missing off-chain source leaves titles blank, a disconnected chain leaves the
selector on the chain with no data and the actions disabled, an unsupported proxy explains itself under the Vote button.

## Related

- **Governance page** (`pages/Governance`) — assembles these pieces and owns the page-level gate.
- [`governance-unlock-flow`](../governance-unlock-flow/README.md) — the dashboard's stand-alone release flow; shares the
  claim-schedule maths but not this feature's state.
- [`dashboard-governance`](../dashboard-governance/README.md) — the dashboard's summaries; opens this feature's
  referendum modal through an adapter.
- **Governance entities** (`entities/governance`) — voting, conviction and claim-schedule maths.
