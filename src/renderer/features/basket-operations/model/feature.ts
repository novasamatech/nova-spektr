import { combine, sample } from 'effector';

import { createFeature } from '@/shared/feature';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { basketUtils } from '@/entities/basket';
import { networkModel } from '@/entities/network';
import { walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';

const $input = combine(
  {
    wallet: walletSelect.$selectedWallet,
    populated: networkModel.$populated,
  },
  ({ wallet, populated }) => {
    if (!populated || nullable(wallet) || !basketUtils.isBasketAvailable(wallet)) return null;

    return wallet;
  },
);

export const basketOperationsFeature = createFeature({
  name: 'basket/operations',
  input: $input,
});

sample({
  clock: walletSelect.$selectedWallet,
  filter: wallet => nonNullable(wallet) && walletUtils.isPolkadotVaultGroup(wallet),
  target: basketOperationsFeature.restore,
});
