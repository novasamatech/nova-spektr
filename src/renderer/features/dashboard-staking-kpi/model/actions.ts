import { createEvent, createStore } from 'effector';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type UnclaimedPayout } from '@/domains/staking';

/**
 * The KPI row never runs a transaction. It only says _what_ the user asked for
 * and _on whose behalf_; the staking flows subscribe to these and own every
 * step from there (fee, signing, submission).
 */
/**
 * One claim, per chain.
 *
 * `payout_stakers_by_page` names the **validator**, never the nominator, and
 * anyone may submit it — the reward still lands on each nominator's own payee.
 * So the row says whose rewards these are (`nominators`, most-preferred first)
 * and leaves who pays the fee to the host, which is the side that knows which
 * accounts this installation can actually sign with.
 */
export type ClaimRequestPayload = {
  requests: { chainId: ChainId; nominators: AccountId[]; payouts: UnclaimedPayout[] }[];
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

/** A chain the host could not find a signer for, reported back to the row. */
export type BlockedClaimChain = { chainId: ChainId; chainName: string };

/**
 * The host says a claim cannot be built.
 *
 * The row disables what it knows it cannot run, but the host is the side that
 * holds the wallets — this is the channel for the case the row could not
 * foresee, so a request can never end in silence again.
 */
const claimBlocked = createEvent<BlockedClaimChain[]>();
const $blockedClaimChains = createStore<BlockedClaimChain[]>([])
  .on(claimBlocked, (_, chains) => chains)
  .reset(claimRequested);
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
  claimBlocked,
  $blockedClaimChains,
  redeemRequested,
  unbondRequested,
};
