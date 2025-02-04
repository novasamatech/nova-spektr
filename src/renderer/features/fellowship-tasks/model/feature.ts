import { combine, sample } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { isDev, nullable } from '@/shared/lib/utils';
import { fellowshipMember } from '@/aggregates/fellowship-member';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';
import { walletSelect } from '@/aggregates/wallet-select';
import { ERROR } from '../constants';

const $input = combine(
  {
    network: fellowshipNetwork.$network,
    member: fellowshipMember.$currentMember,
    walletId: walletSelect.$selectedWalletId,
  },
  ({ network, member }) => {
    if (nullable(network)) return null;

    return {
      api: network.api,
      asset: network.asset,
      chain: network.chain,
      chainId: network.chainId,
      palletType: network.palletType,
      member,
    };
  },
);

export const fellowshipTasksFeature = createFeature({
  name: 'fellowship/tasks',
  enable: $features.map(({ fellowship }) => fellowship && isDev()),
  input: $input,
  filter: input => {
    return input.api.isConnected
      ? null
      : {
          status: 'failed',
          type: 'warning',
          error: new Error(ERROR.networkDisabled),
        };
  },
});

sample({
  clock: fellowshipNetwork.$isActive,
  filter: fellowshipNetwork.$isActive,
  target: fellowshipTasksFeature.restore,
});
