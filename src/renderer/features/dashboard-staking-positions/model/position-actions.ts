import { createEvent, createStore, sample } from 'effector';

import { type Asset, type Chain, type Validator, type Wallet } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
import { type StakingPosition } from '@/domains/staking';
import { type SigningMode, validatorSelectionModel } from '@/features/validator-selection';

/** Everything an action handler needs to open the flow it owns. */
export type PositionActionPayload = {
  position: StakingPosition;
  chain: Chain;
  asset: Asset;
  /** The local account behind the position, `null` when there is none. */
  account: AnyAccount | null;
  wallet: Wallet | null;
  signingMode: SigningMode;
};

export type ClaimPayload = PositionActionPayload & {
  /** Unclaimed total, planck — what the chip showed when it was pressed. */
  amount: string;
};

export type NominationsChangePayload = PositionActionPayload & {
  /** The set the user picked, in the order they built it. */
  validators: Validator[];
};

/**
 * The staking flows this widget hands off to. Phase 4 wires them; the dashboard
 * deliberately builds no transaction of its own — a table row is a place to
 * decide something, not a place to sign it.
 */
const claimRequested = createEvent<ClaimPayload>();
const addStakeRequested = createEvent<PositionActionPayload>();
const unbondRequested = createEvent<PositionActionPayload>();
const nominationsChangeRequested = createEvent<NominationsChangePayload>();
const startStakingRequested = createEvent();

/** One per chip that hands off. `changeValidators` covers the picker's submit. */
export type PositionAction = 'claim' | 'addStake' | 'unbond' | 'changeValidators' | 'startStaking';

/**
 * Which of the events above a host has taken responsibility for.
 *
 * Per action rather than one flag, because they are wired by different flows
 * and some of them still have no destination at all. A chip whose event nobody
 * consumes renders disabled with a tooltip saying so — a chip that looks
 * pressable and silently does nothing is the worse failure: the user cannot
 * tell an unwired button from a broken one.
 */
const $wiredActions = createStore<PositionAction[]>([]);

/** Called by whoever wires the flows — see the spec's "Phase 4 contract". */
const actionsWired = createEvent<PositionAction[]>();

$wiredActions.on(actionsWired, (wired, actions) =>
  actions.every((action) => wired.includes(action)) ? wired : [...new Set([...wired, ...actions])],
);

// --- change validators ---------------------------------------------------------
//
// The only action the dashboard can complete on its own: picking a validator set
// needs no transaction, so the picker opens here and the chosen set leaves as
// `nominationsChangeRequested` for whoever will sign it.

const changeValidatorsRequested = createEvent<PositionActionPayload>();
const changeValidatorsClosed = createEvent();

/**
 * Which position the open picker belongs to. Also what makes the modal visible:
 * one store instead of a boolean plus a payload that could disagree.
 */
const $changeValidatorsTarget = createStore<PositionActionPayload | null>(null)
  .on(changeValidatorsRequested, (_, payload) => payload)
  .reset(changeValidatorsClosed);

/**
 * The picker must list the chain of the _position_, not the chain selected on
 * the Staking page — otherwise changing a Kusama position while Polkadot is
 * selected would quietly offer Polkadot validators. `formInitiated` scopes the
 * validator aggregate for exactly this reason.
 */
sample({
  clock: changeValidatorsRequested,
  fn: ({ chain, asset, position, account, wallet, signingMode }) => ({
    chain,
    asset,
    signingMode,
    initiator: account ?? undefined,
    initiatorWallet: wallet ?? undefined,
    nominatedIds: position.nominations,
  }),
  target: validatorSelectionModel.events.formInitiated,
});

sample({
  clock: validatorSelectionModel.output.formSubmitted,
  source: $changeValidatorsTarget,
  filter: (target: PositionActionPayload | null): target is PositionActionPayload => nonNullable(target),
  fn: (target, validators): NominationsChangePayload => ({ ...target, validators }),
  target: nominationsChangeRequested,
});

// Closing is what clears the picker, and a submit reaches this through
// `nominationsChangeRequested → changeValidatorsClosed` below.
//
// Deliberately NOT clocked on `formSubmitted` directly. `validatorSelectionModel`
// is a singleton shared with the Staking page's bond-nominate/nominate flows,
// which keep the picker alive until their own `flowFinished` so that Back from
// Confirmation can re-enter the validators step. Clearing on every submit —
// including submits this module never opened — wiped their chain, asset and
// selection out from under them.
sample({
  clock: changeValidatorsClosed,
  target: validatorSelectionModel.events.formCleared,
});

// Chained off the outgoing request, not off the clock that produces it: the
// reset must not race the `sample` above that still reads the target.
sample({
  clock: nominationsChangeRequested,
  target: changeValidatorsClosed,
});

export const positionActions = {
  $wiredActions,
  $changeValidatorsTarget,

  events: {
    claimRequested,
    addStakeRequested,
    unbondRequested,
    nominationsChangeRequested,
    startStakingRequested,
    changeValidatorsRequested,
    changeValidatorsClosed,
  },

  actionsWired,
};
