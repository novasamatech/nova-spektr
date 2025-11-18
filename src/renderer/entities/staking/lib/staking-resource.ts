import { type ApiPromise } from '@polkadot/api';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createSubscriptionResource } from '@/shared/resource';

import { stakingUtils } from './staking-utils';
import { type StakingMap } from './types';

type StakingResourceParams = {
  chainId: ChainId;
  api: ApiPromise;
  accounts: AccountId[];
};

export const stakingResource = createSubscriptionResource<StakingResourceParams, StakingMap>({
  name: 'staking',
  pool: (params) => `${params.chainId}_${params.accounts.join('_')}`,
  fn: async (params, callback) => {
    const unsubscribe = await stakingUtils.subscribeStaking(params.chainId, params.api, params.accounts, (staking) => {
      callback({ done: false, value: staking });
    });

    return unsubscribe;
  },
});
