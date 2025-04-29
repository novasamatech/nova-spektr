import { combine, sample } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { accountService, registry, registryService } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';
import { ERROR } from '../constants';

const $input = combine(
  {
    network: fellowshipNetwork.$network,
    accounts: walletModel.$availableAccounts,
    connection: registry.$connectionStatuses,
  },
  ({ network, accounts, connection }) => {
    if (nullable(network) || nullable(connection[network.chainId])) return null;

    return {
      ...network,
      status: connection[network.chainId],
      accounts: accountService.filterAccountOnChain(accounts, network.chain),
    };
  },
);

export const fellowshipActivityFeedFeature = createFeature({
  name: 'fellowship/activity',
  enable: $features.map(({ fellowship }) => fellowship),
  input: $input,
  filter: input => {
    if (input.api.isConnected && registryService.isConnected(input.status)) return null;

    return {
      status: 'failed',
      type: 'warning',
      error: new Error(ERROR.networkDisabled),
    };
  },
});

sample({
  clock: fellowshipNetwork.$isConnected,
  filter: fellowshipNetwork.$isConnected,
  target: fellowshipActivityFeedFeature.restore,
});
