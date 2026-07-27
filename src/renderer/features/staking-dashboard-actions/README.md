# Staking Dashboard Actions

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-07-27

## Overview

The wiring between the staking dashboard's buttons and the staking transaction flows, plus the toast that announces a
draft saved from one of them.

The dashboard's two staking widgets — [`dashboard-staking-kpi`](../dashboard-staking-kpi/README.md) and
[`dashboard-staking-positions`](../dashboard-staking-positions/README.md) — deliberately **only emit**. They build no
transaction, hold no chain, and know nothing about the flows. The flows —
[`staking-claim-rewards`](../staking-claim-rewards/README.md) and
[`staking-amount-flow`](../staking-amount-flow/README.md) — deliberately **only consume**, and know nothing about the
dashboard. This feature is the one module that knows both, and it exists so that neither side has to.

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

- Always registered; it has no feature flag of its own. The widgets it wires are behind **`dashboard`**, and the amount
  flow is behind **`staking`** — the gating below follows the latter.
- The draft toast fires only for a draft one of the two staking flows asked for. A draft created from the standalone
  Create-draft modal keeps its own confirmation and never raises this one.

## What is live, and what is not

| Button                                   | Emitter                      | Destination                           |
| ---------------------------------------- | ---------------------------- | ------------------------------------- |
| Claim (KPI drill-down, position drawer)  | `claimRequested`             | `claimRewardsModel.claimRequested`    |
| Unbond (KPI drill-down, position drawer) | `unbondRequested`            | `stakingAmountFlow.unbondRequested`   |
| Add stake (position drawer)              | `addStakeRequested`          | `stakingAmountFlow.addStakeRequested` |
| + New position / Start staking           | `startStakingRequested`      | Navigation to the Staking page        |
| **Redeem** (KPI drill-down)              | `redeemRequested`            | **none — stays disabled**             |
| **Change validators** (position drawer)  | `nominationsChangeRequested` | **none — stays disabled**             |

**Redeem** has no destination because `features/staking-withdraw` renders into `stakingWithdrawSlot`, a slot that only
exists on the Staking page: firing its model from the dashboard would run a flow whose UI is not mounted.

**Change validators** has no destination because nothing turns the picked validator set into a `nominate` transaction
from here — `features/staking-nominate` is likewise bound to a Staking-page slot, and its form starts from shard
selection rather than from a set the caller already picked. The picker itself works; its submit does not. That is why
the chip is now gated too: a picker that ends on a submit going nowhere is exactly the "looks pressable, does nothing"
failure the positions spec warns about.

Both are wired the moment a flow reachable from the dashboard exists — the events, the payload types and the gating
slots are already in place.

## States / scenarios

| Scenario                                    | What happens                                                                           |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| KPI claim, one chain                        | One claim session with every resolved account of that chain                            |
| KPI claim, several chains                   | One session per chain, run in sequence: the first opens now, the rest queue            |
| Queued chain after a landed claim           | Closing the successful session opens the next chain's                                  |
| Queued chain after a cancelled session      | The queue is dropped — cancelling means cancelling                                     |
| An address with no local account            | Skipped; the rest of the selection still goes through                                  |
| A selection where nothing resolves          | Nothing is dispatched at all — no empty confirm                                        |
| Position claim with no payouts in cache     | Not dispatched; an empty batch would fail on chain                                     |
| KPI unbond with no position behind it       | Skipped — there is no active stake to cap the amount against                           |
| Draft saved from claim / unbond / add stake | Bottom-left toast, auto-dismissing, with a `View drafts →` link to the Operations page |
| Signed submission                           | No draft toast — the flows' own submit confirmation stands                             |

### Multi-chain claims

The claim flow signs on **one network at a time**: it cannot quote a fee spanning two native tokens. A KPI selection
covering two chains is therefore grouped by chain and dispatched as two sessions, back to back. The queue only advances
once a claim has actually landed; a cancelled session drops it, because re-opening a modal the user just dismissed is
worse than losing a queue they can rebuild in two clicks.

Every dispatch goes through an effect rather than straight into the flow. The queue advances on `flowFinished`, and the
flow resets its own selection and step on that very event — handing it a new request inside the same tick would race
those resets.

### The draft toast

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

- **Redeem and Change validators are still gated** — see the table above.
- Toggling the `staking` flag off after start does not re-gate the amount-flow chips: the gating store only ever
  accumulates. The flag is a dev toggle and is read at start.
- The toast names the signer through the account-name chain with the wallet name as a fallback; it degrades to a short
  address rather than blocking on name resolution.

## Related

- [`dashboard-staking-kpi`](../dashboard-staking-kpi/README.md) — the KPI row's Claim / Redeem / Unbond requests.
- [`dashboard-staking-positions`](../dashboard-staking-positions/README.md) — the positions table and its detail drawer.
- [`staking-claim-rewards`](../staking-claim-rewards/README.md) — the claim session this feature dispatches into.
- [`staking-amount-flow`](../staking-amount-flow/README.md) — the unbond / add-stake screen.
- [`staking-positions`](../../aggregates/staking-positions/README.md) — where the positions and eras behind a KPI
  request come from.
- `features/drafts` — the draft the toast announces, and the Operations page it links to.
