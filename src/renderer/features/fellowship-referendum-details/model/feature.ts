import { combine, sample } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { accountService } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

const $input = combine(fellowshipNetwork.$network, walletModel.$availableAccounts, (network, accounts) => {
  if (nullable(network)) return null;

  return {
    api: network.api,
    asset: network.asset,
    chain: network.chain,
    chainId: network.chainId,
    palletType: network.palletType,
    accounts: accountService.filterAccountsOnChain(accounts, network.chain),
  };
});

export const fellowshipReferendumsDetailsFeature = createFeature({
  name: 'fellowship/referendum details',
  enable: $features.map(({ fellowship }) => fellowship),
  input: $input,
  filter: input => {
    if (input.api.isConnected) return null;

    return {
      status: 'failed',
      type: 'warning',
      error: new Error('Network disabled'),
    };
  },
});

sample({
  clock: fellowshipNetwork.$isConnected,
  filter: fellowshipNetwork.$isConnected,
  target: fellowshipReferendumsDetailsFeature.restore,
});
