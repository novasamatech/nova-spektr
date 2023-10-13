import { createStore, combine, createEvent, forward } from 'effector';

import { walletModel, walletUtils } from '@renderer/entities/wallet';
import { WalletType, WalletFamily, Wallet } from '@renderer/shared/core';
import { includes } from '@renderer/shared/lib/utils';

const $filterQuery = createStore<string>('');

const $filteredWalletGroups = combine(walletModel.$wallets, $filterQuery, (wallets, query) => {
  return wallets.reduce<Record<WalletFamily, Wallet[]>>(
    (acc, wallet) => {
      let groupIndex: WalletFamily | undefined;
      if (walletUtils.isPolkadotVault(wallet)) groupIndex = WalletType.POLKADOT_VAULT;
      if (walletUtils.isMultisig(wallet)) groupIndex = WalletType.MULTISIG;
      if (walletUtils.isWatchOnly(wallet)) groupIndex = WalletType.WATCH_ONLY;
      if (groupIndex && includes(wallet.name, query)) {
        acc[groupIndex].push(wallet);
      }

      return acc;
    },
    {
      [WalletType.POLKADOT_VAULT]: [],
      [WalletType.MULTISIG]: [],
      [WalletType.WATCH_ONLY]: [],
    },
  );
});

const queryChanged = createEvent<string>();

forward({ from: queryChanged, to: $filterQuery });

export const walletSelectModel = {
  $filteredWalletGroups,
  events: {
    queryChanged,
  },
};
