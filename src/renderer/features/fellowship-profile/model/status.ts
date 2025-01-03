import { combine, sample } from 'effector';

import { createFeature } from '@/shared/effector';
import { nullable } from '@/shared/lib/utils';
import { accounts } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';
import { ERROR } from '../constants';

const $input = combine(
  {
    network: fellowshipNetworkFeature.model.network.$network,
    wallet: walletModel.$activeWallet,
    accounts: accounts.$list,
  },
  ({ network, wallet, accounts }) => {
    if (nullable(network) || nullable(wallet)) return null;

    return {
      api: network.api,
      asset: network.asset,
      chain: network.chain,
      chainId: network.chainId,
      palletType: network.palletType,
      accounts,
      wallet,
    };
  },
);

export const profileFeatureStatus = createFeature({
  name: 'profile',
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
  target: profileFeatureStatus.restore,
});
