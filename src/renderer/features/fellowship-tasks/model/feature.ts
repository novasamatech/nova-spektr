import { combine, sample } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { isDev, nullable } from '@/shared/lib/utils';
import { accountsService } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';
import { ERROR } from '../constants';

const $input = combine(
  {
    network: fellowshipNetwork.$network,
    accounts: walletModel.$availableAccounts,
  },
  ({ network, accounts }) => {
    if (nullable(network)) return null;

    return {
      api: network.api,
      asset: network.asset,
      chain: network.chain,
      chainId: network.chainId,
      palletType: network.palletType,
      accounts: accountsService.filterAccountOnChain(accounts, network.chain),
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
