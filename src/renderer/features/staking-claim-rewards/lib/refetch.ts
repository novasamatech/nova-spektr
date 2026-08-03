import { type ApiPromise } from '@polkadot/api';

import { type Chain, type ChainId, type EraIndex } from '@/shared/core';
import { stakingPallet } from '@/shared/pallet/staking';
import { type PayoutsResourceParams, rewardsService } from '@/domains/staking';
import { type ClaimedRewards } from '../types';

type Params = {
  claimed: ClaimedRewards;
  apis: Record<ChainId, ApiPromise>;
  chains: Record<ChainId, Chain>;
  eras: Record<ChainId, EraIndex>;
};

/**
 * The `payoutsResource` requests that cover exactly what was just claimed — one
 * per stash, on the chain the claim landed on.
 *
 * Returns nothing when the chain cannot be described well enough to ask (no
 * api, no active era, no staking pallet). A missed refresh only means the
 * figures stay stale until the next era; it is never worth throwing over.
 */
export function buildPayoutRefetchParams({ claimed, apis, chains, eras }: Params): PayoutsResourceParams[] {
  const { chainId } = claimed.chain;
  const api = apis[chainId];
  const activeEra = eras[chainId];
  if (!api || activeEra === undefined) return [];

  let historyDepth: number;
  try {
    historyDepth = stakingPallet.consts.historyDepth(api);
  } catch {
    return [];
  }

  const rewardSources = rewardsService.collectChainRewardSources(claimed.chain, chains, 'staking-chain');

  return claimed.claims.map((claim) => ({
    chainId,
    api,
    stash: claim.account.accountId,
    activeEra,
    historyDepth,
    rewardSources,
  }));
}
