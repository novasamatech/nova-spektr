import { combine, sample } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { accountService } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';
import { ERROR } from '../constants';

const $input = combine(
  {
    network: fellowshipNetwork.$network,
    accounts: walletModel.$availableAccounts,
    connected: fellowshipNetwork.$isConnected,
  },
  ({ network, accounts, connected }) => {
    if (nullable(network)) return null;

    return {
      ...network,
      connected,
      accounts: accountService.filterAccountsOnChain(accounts, network.chain),
    };
  },
);

export const fellowshipActivityFeedFeature = createFeature({
  name: 'fellowship/activity',
  enable: $features.map(({ fellowship }) => fellowship),
  input: $input,
  filter: input => {
    if (input.connected) return null;

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
