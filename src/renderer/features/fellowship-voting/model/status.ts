import { combine } from 'effector';

import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { walletModel } from '@/entities/wallet';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';

const $input = combine(
  {
    network: fellowshipNetworkFeature.model.network.$network,
    wallets: walletModel.$wallets,
    wallet: walletModel.$activeWallet,
    accounts: walletModel.$availableAccounts,
  },
  ({ network, wallets, wallet, accounts }) => {
    if (nullable(network) || nullable(wallet)) return null;

    return {
      api: network.api,
      asset: network.asset,
      chain: network.chain,
      chainId: network.chainId,
      palletType: network.palletType,
      activeAccounts: wallet.accounts,
      accounts,
      wallets,
      wallet,
    };
  },
);

export const votingFeatureStatus = createFeature({
  name: 'fellowship/voting',
  input: $input,
});
