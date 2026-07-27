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

export type StakingKpiAction = 'claim' | 'redeem' | 'unbond';

/**
 * Which requests something is listening to.
 *
 * Per action, not one flag: the three are served by different flows and one of
 * them may have no destination at all. A button whose event nobody consumes
 * renders disabled with a tooltip instead of firing into the void — a button
 * that appears to work and does nothing is worse than one that says it is not
 * ready yet.
 */
const enableActions = createEvent<StakingKpiAction[]>();
const $enabledActions = createStore<StakingKpiAction[]>([]).on(enableActions, (enabled, actions) =>
  actions.every((action) => enabled.includes(action)) ? enabled : [...new Set([...enabled, ...actions])],
);

export const dashboardStakingKpiActions = {
  $enabledActions,
  enableActions,

  claimRequested,
  redeemRequested,
  unbondRequested,
};
