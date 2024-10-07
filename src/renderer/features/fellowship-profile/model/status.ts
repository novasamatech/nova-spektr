import { combine, sample } from 'effector';

import { createFeature } from '@shared/effector';
import { nullable } from '@shared/lib/utils';
import { walletModel } from '@entities/wallet';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';
import { ERROR } from '../constants';

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
      wallet,
    };
  },
);

export const profileFeatureStatus = createFeature({
  name: 'profile',
  input: $input,
});

sample({
  clock: fellowshipNetworkFeature.model.network.$isActive,
  filter: fellowshipNetworkFeature.model.network.$isActive,
  target: profileFeatureStatus.restore,
});

sample({
  clock: [fellowshipNetworkFeature.model.network.$isDisconnected, profileFeatureStatus.start],
  filter: fellowshipNetworkFeature.model.network.$isDisconnected,
  fn: () => ({ type: 'warning' as const, error: new Error(ERROR.networkDisabled) }),
  target: profileFeatureStatus.fail,
});
