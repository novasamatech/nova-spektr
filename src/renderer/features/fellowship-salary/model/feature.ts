import { combine, sample } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { isDev, nullable } from '@/shared/lib/utils';
import { accountsService } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';
import { ERROR } from '../constants';

const $input = combine(
  {
    network: fellowshipNetworkFeature.model.network.$network,
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

export const fellowshipSalaryFeature = createFeature({
  name: 'fellowship/salary',
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
  clock: fellowshipNetworkFeature.model.network.$isActive,
  filter: fellowshipNetworkFeature.model.network.$isActive,
  target: fellowshipSalaryFeature.restore,
});
