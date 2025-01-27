import { combine } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { accountsService } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

const $input = combine(
  {
    network: fellowshipNetwork.$network,
    wallets: walletModel.$wallets,
    accounts: walletModel.$availableAccounts,
  },
  ({ network, wallets, accounts }) => {
    if (nullable(network)) return null;

    return {
      api: network.api,
      asset: network.asset,
      chain: network.chain,
      chainId: network.chainId,
      palletType: network.palletType,
      accounts: accountsService.filterAccountOnChain(accounts, network.chain),
      wallets,
    };
  },
);

export const votingFeatureStatus = createFeature({
  name: 'fellowship/voting',
  enable: $features.map(({ fellowship }) => fellowship),
  input: $input,
});
