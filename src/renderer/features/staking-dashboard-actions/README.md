# Staking Dashboard Actions

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-12

## Overview

The wiring between the staking dashboard's buttons and the staking transaction flows, plus the toast that announces a
draft saved from one of them.

The dashboard's two staking widgets — [`dashboard-staking-kpi`](../dashboard-staking-kpi/README.md) and
[`dashboard-staking-positions`](../dashboard-staking-positions/README.md) — deliberately **only emit**. They build no
transaction, hold no chain, and know nothing about the flows. The flows —
[`staking-claim-rewards`](../staking-claim-rewards/README.md), [`staking-amount-flow`](../staking-amount-flow/README.md)
and [`staking-confirm-flow`](../staking-confirm-flow/README.md) — deliberately **only consume**, and know nothing about
the dashboard. This feature is the one module that knows both, and it exists so that neither side has to.

It owns three jobs:

1. **Resolution.** A KPI request carries an `accountId`, a `chainId` and a list of payouts — the row never holds a
   chain, an asset or a wallet. A claim flow needs all of them. The gap is closed here, from `networkModel.$chains`, the
   chain's staking asset, `accounts` and `walletModel`.
2. **Routing.** Forwarding what is already complete (the position drawer's payloads are a structural superset of what
   the amount flow takes), splitting what the flow cannot take in one piece (a multi-chain claim), and sending
   `Start staking` to the page that owns bonding.
3. **Gating.** Announcing, per action, which buttons now have a destination. A button whose event nobody consumes stays
   disabled with a tooltip rather than firing into the void.

## Who can use it / when it applies

- Always registered; it has no feature flag of its own. The widgets it wires are behind **`dashboard`**, and the two
  transaction flows are behind **`staking`** — the gating below follows the latter.
- The draft toast fires only for a draft one of the staking flows asked for. A draft created from the standalone
  Create-draft modal keeps its own confirmation and never raises this one.

## What is live

| Button                                   | Emitter                      | Destination                                    |
| ---------------------------------------- | ---------------------------- | ---------------------------------------------- |
| Claim (KPI drill-down, position drawer)  | `claimRequested`             | `claimRewardsModel.claimRequested`             |
| Unbond (KPI drill-down, position drawer) | `unbondRequested`            | `stakingAmountFlow.unbondRequested`            |
| Add stake (position drawer)              | `addStakeRequested`          | `stakingAmountFlow.addStakeRequested`          |
| Redeem (KPI drill-down)                  | `redeemRequested`            | `stakingConfirmFlow.redeemRequested`           |
| Change validators (position drawer)      | `nominationsChangeRequested` | `stakingConfirmFlow.changeValidatorsRequested` |
| + New position / Start staking           | `startStakingRequested`      | Navigation to the Staking page                 |

Every dashboard staking action now has a destination. The Staking page's own forms (`staking-withdraw`,
`staking-nominate`) stay where they are: both render into Staking-page slots, so firing their models from the dashboard
would run a flow whose UI is not mounted. The dashboard signs through the two dashboard-owned flows instead.

The chips for the four flow-backed actions still follow the `staking` flag, so a build with the flag off renders them
disabled with the "not connected yet" tooltip rather than opening a modal that is not mounted.

## States / scenarios

| Scenario                                  | What happens                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| KPI claim, one chain                      | One claim session with every resolved account of that chain                              |
| KPI claim, several chains                 | One session per chain, run in sequence: the first opens now, the rest queue              |
| Queued chain after a landed claim         | Closing the successful session opens the next chain's                                    |
| Queued chain after a cancelled session    | The queue is dropped — cancelling means cancelling                                       |
| An address with no local account          | Skipped; the rest of the selection still goes through                                    |
| A selection where nothing resolves        | Nothing is dispatched at all — no empty confirm                                          |
| Position claim with no payouts in cache   | Not dispatched; an empty batch would fail on chain                                       |
| KPI unbond with no position behind it     | Skipped — there is no active stake to cap the amount against                             |
| KPI redeem with no position behind it     | Skipped — there is no ledger to withdraw from                                            |
| KPI redeem with nothing unlocked          | Skipped — the call would move nothing and still cost a fee                               |
| Picked validator set submitted            | Forwarded unchanged; the payload the picker produced is the payload the confirm opens on |
| Draft saved from any of the staking flows | Bottom-left toast, auto-dismissing, with a `View drafts →` link to the Operations page   |
| Signed submission                         | No draft toast — the flows' own submit confirmation stands                               |

### Multi-chain claims

The claim flow signs on **one network at a time**: it cannot quote a fee spanning two native tokens. A KPI selection
covering two chains is therefore grouped by chain and dispatched as two sessions, back to back. The queue only advances
once a claim has actually landed; a cancelled session drops it, because re-opening a modal the user just dismissed is
worse than losing a queue they can rebuild in two clicks.

Every dispatch goes through an effect rather than straight into the flow. The queue advances on `flowFinished`, and the
flow resets its own selection and step on that very event — handing it a new request inside the same tick would race
those resets.

### Which redeemable figure is used

A KPI redeem request carries the number the chip was showing, but `withdraw_unbonded` takes no amount at all — it
withdraws whatever the ledger has unlocked. The figure the confirm leads with therefore comes from the **position**, not
from the request: both come from the same aggregate, and the position is one refresh fresher. A position with nothing
unlocked is dropped rather than opened.

### The draft toast

Every flow that can save a draft looks the same to the toast — what it was asked to do, on which network, for how much,
and who will have to sign it — so they are bound as a list rather than as a named block each. A new staking action joins
the toast by being bound alongside them, with nothing else to change.

What the toast says is snapshotted when the user presses **Save as draft**, not when the draft comes back:
`createDraftModel.draftCreated` closes the flow through `wireDraftCloseRedirect`, which resets the very stores the line
is built from. Reading them at announcement time would describe an empty flow.

Draft and signed submission are told apart by two independent facts: `createDraftModel.draftCreated` fires only on the
draft path, and the flow's own `$initiatedDraft` marker says the draft that landed is this flow's. A signed operation
goes confirm → sign → submit and touches neither.

## Lifecycle

Bound once at module load, in `model/instance.ts`, and announced through `wire()` from the feature's `index.tsx` — the
dashboard renders its chips from the gating stores, and a chip that flickers from disabled to enabled reads as a bug.

The graph itself is a **factory** taking every unit it talks to as a parameter. That is what lets the routing decisions
be tested without dragging either side's UI into a test run; `model/instance.ts` binds the real units, the tests bind
stand-ins.

## Known gaps

- Toggling the `staking` flag off after start does not re-gate the flow-backed chips: the gating store only ever
  accumulates. The flag is a dev toggle and is read at start.
- **Redeem has no chip in the position drawer** — the drawer's unbonding strip counts down but does not offer to
  withdraw. Redeem is requested from the KPI drill-down only, which is where the approved design puts it; adding a
  drawer chip would mean a new position action, and the drawer's own spec does not list one.
- The toast names the signer through the account-name chain with the wallet name as a fallback; it degrades to a short
  address rather than blocking on name resolution.

## Nothing is ever swallowed

A claim entry the host cannot complete is **reported**, never dropped. The previous code turned an unresolvable
selection into an empty list and an empty list into no clock tick at all, so the Claim button fired an event nobody
could act on and the user was told nothing — a dead button with no error, no log and no toast.

The resolver now answers with `{ requests, skipped }`, and a selection that resolves to nothing sends the chains back to
the row through `claimBlocked`. The row also prevents the case up front: a Claim button on a network this installation
holds no signing key for is disabled and says so.

**The payer is resolved, not assumed.** A payout is permissionless, so the nominator is only the first candidate: when
it is an address-book position, any account of ours that can sign on that chain is used instead. See the claim flow's
own spec for the reasoning.

**The signing mode travels with the request.** Every target this feature dispatches carries a `signingMode`, so a flow
opened for an address-book position starts in draft mode instead of making the user discover the toggle. The drawer's
payloads keep the mode the drawer computed; a KPI-resolved target derives it here (no local account → `draft`, an
account that holds no key → `watchOnly`, otherwise `local`). Claims are the exception: the payer's mode wins — the
drawer may say `draft` for a contact position, but the substituted payer can sign, so the claim request goes out
`local`.

## Related

- [`dashboard-staking-kpi`](../dashboard-staking-kpi/README.md) — the KPI row's Claim / Redeem / Unbond requests.
- [`dashboard-staking-positions`](../dashboard-staking-positions/README.md) — the positions table and its detail drawer.
- [`staking-claim-rewards`](../staking-claim-rewards/README.md) — the claim session this feature dispatches into.
- [`staking-amount-flow`](../staking-amount-flow/README.md) — the unbond / add-stake screen.
- [`staking-confirm-flow`](../staking-confirm-flow/README.md) — the change-validators / redeem confirm.
- [`staking-positions`](../../aggregates/staking-positions/README.md) — where the positions and eras behind a KPI
  request come from.
- `features/drafts` — the draft the toast announces, and the Operations page it links to.
