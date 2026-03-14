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
