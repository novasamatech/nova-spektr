import { combine } from 'effector';

import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { accountsService } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';

const $input = combine(
  fellowshipNetworkFeature.model.network.$network,
  walletModel.$availableAccounts,
  (network, accounts) => {
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

export const referendumsDetailsFeatureStatus = createFeature({
  name: 'fellowship/referendum details',
  input: $input,
});
