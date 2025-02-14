import { combine, sample } from 'effector';

import { createFeature } from '@/shared/feature';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';

const $input = combine(
  {
    wallet: walletSelect.$selectedWallet,
  },
  ({ wallet }) => {
    if (nullable(wallet) || !walletUtils.isPolkadotVaultGroup(wallet)) return null;

    return wallet;
  },
);

export const basketOperationsFeature = createFeature({
  name: 'basket/operations',
  input: $input,
});

sample({
  clock: walletSelect.$selectedWallet,
  filter: (wallet) => nonNullable(wallet) && walletUtils.isPolkadotVaultGroup(wallet),
  target: basketOperationsFeature.restore,
});
