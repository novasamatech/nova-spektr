# Staking new position flow (bond + nominate)

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-25

## Overview

Starting a staking position from the dashboard: pick a network and an account, choose how much to bond and where the
rewards go, pick validators, sign. One `BATCH_ALL` carrying `staking.bond` and `staking.nominate`.

This is the flow that closed the dashboard's last redirect. Every other staking action a dashboard row offers — claim,
add stake, unbond, change validators, redeem — already opened as a modal over the dashboard; **New position** sent the
user to the Staking page instead. Now nothing does.

### What makes it different from its siblings

`staking-amount-flow` and `staking-confirm-flow` open **against a position**, and inherit its network and its account. A
new position has neither, and the dashboard — unlike the Staking page, which the old `staking-bond-nominate` feature
lived on — has no selected network to borrow. So this flow owns two fields the others do not need: **which chain** and
**which account**.

It also asks two unrelated questions, "how much" and "backed by whom", which is why there is a validators step between
the form and the confirm.

## Who can use it / when it applies

Any account the chosen chain can hold — the same key-scheme and chain-binding rule the rest of the app applies. Multisig
and proxy routes are resolved by the shared signing path, exactly as in the sibling flows. A watch-only account, or one
whose route cannot sign, reaches the same place it always does: draft mode, where the operation is saved for whoever
can.

Multishard Vault wallets are **not** fanned out. The old feature carried a second `*-shards` implementation for that;
this flow stakes from one account, matching what `staking-amount-flow` and `staking-confirm-flow` support.

## States / scenarios

| State      | When                                             | What the user sees                                                                                                                               |
| ---------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Form       | The flow opens                                   | Network, stake from, amount, rewards destination, fee                                                                                            |
| Invalid    | The shared validator rejects the operation       | The standard "This operation cannot be completed" alert, a red frame on the amount when the amount itself is the problem, and `Continue` refuses |
| No signer  | The picked account's route ends without a signer | A red "No account to sign with" alert, and `Continue` refuses                                                                                    |
| Validators | `Continue` on a valid form                       | The shared validator picker, scoped to this flow's chain and account                                                                             |
| Confirm    | A validator set is submitted                     | Amount, rewards destination, validator count, fee, multisig deposit                                                                              |
| Sign       | `Sign` on the confirm                            | The standard signing step                                                                                                                        |
| Submit     | The signature is in                              | The standard submit step                                                                                                                         |
| Draft      | Draft mode is on                                 | The form saves a draft instead of signing, and the flow ends there                                                                               |

**Validation is the same pipeline the transfer flow runs**, not a private set of checks. From the first keystroke the
form validates through `bondNominateValidator` — fee, existential deposit, multisig deposit, proxy permissions, "can the
account reserve the amount", and the chain minimum — and every verdict is rendered by the shared
`TransactionValidationError` alert. Until the validators are picked there is no real call to validate, so the validator
runs against the fee probe (the largest call the flow could send), which is the same upper bound `Max` is computed
against. The confirm step re-runs the same validator on the real call. Draft mode hides the alert and skips the gate, as
transfers do: a draft is for somebody else to sign.

**The minimum bond blocks rather than warns** — the opposite of what the unbond screen does with the same figure. The
reason is the call, not the policy: `staking.nominate` rejects a stash bonded below `MinNominatorBond`, and the bond and
the nomination travel as one `BATCH_ALL`. A bond under the minimum does not create a smaller position; it fails the
whole transaction after the user has paid to find out. Exactly the minimum is legal and accepted.

**The minimum is read against the resolved chain**, not the requested one. A requested network the running config does
not have falls back to the first staking chain, and a minimum looked up under the request would read as zero — which is
"no floor", the one answer that lets an invalid bond through.

**"Stake from" follows the active wallet.** The field seeds itself with the selected wallet's account (falling back to
the first candidate the chain can hold), and a wallet switch — mid-form or between opens — re-seeds it the same way, so
`Available` always quotes the wallet the user just switched to. **Opening the flow re-seeds too**, not only a change in
the candidate list: closing clears the field, and by the second open the wallets and accounts settled long ago and never
emit again — a form that waited for them would reopen with no source, no path to draw, an available balance of zero and
a Continue button that could never light up. The switch is deliberate and wins over a hand-picked account; re-selecting
the already-active wallet changes nothing.

**A picked account nobody can sign for blocks, and says why.** Once an account is chosen, the resolved signing route is
checked for an actual signer at its end. When there is none — the account is watch-only — `Continue` refuses and a red
**"No account to sign with"** alert names the two ways forward: add a wallet that controls the account, or save the
operation as a draft for whoever can sign. An empty account field is not this error — `Continue` simply waits for one —
and the guard stands down in draft mode, where nobody local is expected to sign.

**A multisig route adds the shared description field to the confirm** — the note the initiator attaches for the other
signatories, published to the shared address book once the operation is included. Whether the field, an error or nothing
shows is decided by the [multisig-operation-description](../../aggregates/multisig-operation-description/README.md)
aggregate; a plain route shows nothing.

### The fee before there is a call

The amount is entered before the validators are known, so there is no real call to price yet. The flow prices the
largest one it could end up sending instead — a full nomination slate against the whole reservable balance — and
`createComplexTxStore` falls back to it while the real transaction is `null`. `Max` is therefore a little conservative:
it errs towards leaving a few planck behind rather than towards a confirm that cannot pay its own fee.

## The shared picker

The validator picker is a **singleton**, shared with the Staking page's own bond-nominate and nominate flows. Two rules
follow, and both are load-bearing:

- It is opened with this flow's chain, asset and account explicitly. Otherwise it would still be scoped to whatever
  opened it last — offering Polkadot validators for a Kusama position.
- A submission is claimed only while this flow stands **at** the validators step, and the picker is cleared when that
  step is left for good — never on submit. Clearing on every submit wiped the other flows' chain and selection out from
  under them; `dashboard-staking-positions/model/position-actions.ts` carries the same warning for the same reason.

Back from the confirm returns to the picker with the selection intact, which is the whole point of not clearing on
submit.

## Lifecycle

The dashboard's **New position** button fires `positionActions.events.startStakingRequested`, which
`staking-dashboard-actions` routes to `newPositionRequested`. The button is gated on this flow being enabled, so with
the `staking` flag off it renders disabled with the "not connected yet" tooltip rather than firing into the void.

The flow is injected into the app shell's `modalsSlot`, so it is alive wherever the dashboard is — it is opened by an
event, never by navigation.

## Drafts

Draft mode is the shared binding, as in every other staking flow: the form saves a draft instead of walking to the
confirm, the draft is built from the draft path's own source account, and a saved draft ends the flow. The dashboard's
draft toast names the operation `newPosition`.

The figures follow the draft, too: **Available and `Max` read the draft path's source account** — the account the bond
will actually spend from — not the connected wallet's pick, and no fee is subtracted, because the eventual signer pays
it at submit time. Until a source is chosen the available balance reads zero rather than borrowing a figure from an
account the draft will not spend from.

## Add to basket

The confirm carries the same secondary **"Add to basket"** button every old staking flow has: instead of signing now,
the built `bond` + `nominate` batch is stored in the basket for this wallet to sign later, a success toast confirms it
and the flow closes.

The basket signs the stored core call directly by its initiator — no multisig/proxy wrapping happens in the basket
context — so the button only appears when the staking account's own wallet is one the basket can sign with (Polkadot
Vault or a single Parity Signer shard). Watch-only, multisig, proxied and WalletConnect accounts never see it. Basket
and draft are mutually exclusive by nature — a draft is "somebody else signs later", the basket is "this wallet signs
later" — and draft mode ends at the form screen, so it never reaches this confirm at all.

As in the old flows, the gate deliberately ignores the confirm's validation verdict: the basket revalidates every stored
transaction before it is signed, so a check that fails at this moment must not block storing the call for later.

## Rules carried over from the old flow

- Validation is `bondNominateValidator` from `features/operations/OperationsValidation` — the same rules the Staking
  page's `staking-bond-nominate` runs, including the "can this account actually reserve what it is bonding" check and
  the chain minimum.
- The call is `transactionBuilder.buildBondNominate`, so the dashboard and the Staking page produce the same extrinsic.
- The origin of the inner call is the account being staked from, never the signer: a multisig wraps the call, it does
  not replace its origin.

## Related

- `features/staking-amount-flow`, `features/staking-confirm-flow` — the sibling in-place flows this one is modelled on.
- `features/staking-dashboard-actions` — the wiring that opens it.
- `features/validator-selection` — the picker, shared with the Staking page.
- `features/staking-bond-nominate` — the Staking page's own bond+nominate, still reachable there.
