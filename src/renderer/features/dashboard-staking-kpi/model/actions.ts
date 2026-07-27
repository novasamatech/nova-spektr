import { createEvent, createStore } from 'effector';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type UnclaimedPayout } from '@/domains/staking';

/**
 * The KPI row never runs a transaction. It only says _what_ the user asked for
 * and _on whose behalf_; the staking flows subscribe to these and own every
 * step from there (fee, signing, submission).
 */
export type ClaimRequestPayload = {
  requests: { accountId: AccountId; chainId: ChainId; payouts: UnclaimedPayout[] }[];
};

export type RedeemRequestPayload = {
  accountId: AccountId;
  chainId: ChainId;
  /** Planck already unlocked and withdrawable. */
  amount: string;
};

export type UnbondRequestPayload = {
  accountId: AccountId;
  chainId: ChainId;
};

const claimRequested = createEvent<ClaimRequestPayload>();
const redeemRequested = createEvent<RedeemRequestPayload>();
const unbondRequested = createEvent<UnbondRequestPayload>();

/**
 * Whether anything is listening. Until a staking flow calls `enableActions`,
 * the primary buttons render disabled with a tooltip instead of firing an event
 * into the void — a button that appears to work and does nothing is worse than
 * one that says it is not ready yet.
 */
const enableActions = createEvent();
const $actionsEnabled = createStore(false).on(enableActions, () => true);

export const dashboardStakingKpiActions = {
  $actionsEnabled,
  enableActions,

  claimRequested,
  redeemRequested,
  unbondRequested,
};
