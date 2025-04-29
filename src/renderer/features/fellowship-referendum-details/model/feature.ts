import { combine } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { accountService } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

const $input = combine(fellowshipNetwork.$network, walletModel.$availableAccounts, (network, accounts) => {
  if (nullable(network)) return null;

  return {
    ...network,
    accounts: accountService.filterAccountOnChain(accounts, network.chain),
  };
});

export const fellowshipReferendumsDetailsFeature = createFeature({
  name: 'fellowship/referendum details',
  enable: $features.map(({ fellowship }) => fellowship),
  input: $input,
});
