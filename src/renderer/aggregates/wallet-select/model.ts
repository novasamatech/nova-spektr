import { attach, combine, sample } from 'effector';

import { type ID } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { accounts, accountsService } from '@/domains/network';
import { walletModel } from '@/entities/wallet';

const $selectedWallet = walletModel.$wallets.map(wallets => {
  return wallets.find(wallet => wallet.isActive) ?? null;
});

const $selectedAccounts = combine($selectedWallet, accounts.$list, (wallet, accounts) => {
  if (nullable(wallet)) return [];

  return accountsService.filterAccountsByWallet(accounts, wallet.id);
});

const selectWalletFx = attach({
  source: walletModel.$allWallets,
  async effect(wallets, id: ID | null) {
    if (nullable(id)) {
      return;
    }

    const currentSelectedWallets = wallets.filter(w => w.isActive);
    const walletToSelect = wallets.find(w => w.id === id);

    // wallet not found
    if (nullable(walletToSelect)) {
      return;
    }

    // wallet is already selected
    if (walletToSelect.isActive) {
      return;
    }

    await walletModel.updateWallet({ ...walletToSelect, isActive: true });
    await Promise.all(
      currentSelectedWallets.map(w => {
        return walletModel.updateWallet({ ...w, isActive: false });
      }),
    );
  },
});

sample({
  clock: walletModel.$wallets,
  filter: wallets => wallets.every(wallet => !wallet.isActive),
  fn: wallets => wallets.at(0)?.id ?? null,
  target: selectWalletFx,
});

export const walletSelect = {
  $selectedWallet,
  $selectedAccounts,
  select: selectWalletFx,
};
