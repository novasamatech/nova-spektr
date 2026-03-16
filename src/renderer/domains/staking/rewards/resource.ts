import { createStore } from 'effector';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createQueryResource } from '@/shared/query';
import { type RewardSource, type RewardsMap } from '../_lib/types';

import { fetchStakingRewards } from './service';

export type StakingRewardsParams = {
  chainId: ChainId;
  accounts: AccountId[];
  rewardSources: RewardSource[];
  since?: number;
};

const $rewardsCache = createStore<Record<string, RewardsMap>>({});

export const stakingRewardsResource = createQueryResource<StakingRewardsParams>({
  key: ({ chainId, accounts, since }) => [chainId, ...accounts, since ?? 'all'],
})
  .name('staking-rewards')
  .request<RewardsMap>(({ accounts, rewardSources, since }) => {
    const baseMap = accounts.reduce<RewardsMap>((acc, account) => {
      acc[account] = '0';

      return acc;
    }, {});

    return fetchStakingRewards({ accounts, rewardSources, baseMap, since });
  })
  .cache({
    store: $rewardsCache,
    map: (state, rewards, { chainId, since }) => ({
      ...state,
      [`${chainId}-${since ?? 'all'}`]: rewards,
    }),
    staleAfter: 10 * 60 * 1000,
  })
  .build();
