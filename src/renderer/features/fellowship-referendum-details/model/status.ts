import { combine } from 'effector';

import { createFeature } from '@/shared/effector';
import { nullable } from '@/shared/lib/utils';
import { walletModel } from '@/entities/wallet';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';

const $input = combine(
  fellowshipNetworkFeature.model.network.$network,
  walletModel.$activeWallet,
  (network, wallet) => {
    if (nullable(network) || nullable(wallet)) return null;

    return {
      api: network.api,
      asset: network.asset,
      chain: network.chain,
      chainId: network.chainId,
      palletType: network.palletType,
      accounts: wallet.accounts,
    };
  },
);

export const referendumsDetailsFeatureStatus = createFeature({
  name: 'fellowship/referendum details',
  input: $input,
});
