import { createStore } from 'effector';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createQueryResource } from '@/shared/query';
import { fetchStakingRewards } from '../api/stakingRewardsService';

import { type RewardSource } from './staking-utils';
import { type RewardsMap } from './types';

export type StakingRewardsParams = {
  chainId: ChainId;
  accounts: AccountId[];
  rewardSources: RewardSource[];
};

const $rewardsCache = createStore<Record<ChainId, RewardsMap>>({});

export const stakingRewardsResource = createQueryResource<StakingRewardsParams>({
  key: ({ chainId, accounts }) => [chainId, ...accounts],
})
  .name('staking-rewards')
  .request<RewardsMap>(({ accounts, rewardSources }) => {
    const baseMap = accounts.reduce<RewardsMap>((acc, account) => {
      acc[account] = '0';

      return acc;
    }, {});

    return fetchStakingRewards({ accounts, rewardSources, baseMap });
  })
  .cache({
    store: $rewardsCache,
    map: (state, rewards, { chainId }) => ({
      ...state,
      [chainId]: rewards,
    }),
  })
  .build();
