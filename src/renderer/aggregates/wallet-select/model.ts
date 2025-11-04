import { combine, createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';
import { readonly } from 'patronum';

import { type ID } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { accountService, accounts } from '@/domains/network';
import { walletModel } from '@/entities/wallet';

const selectWallet = createEvent<ID | null>();
const $selectedWalletId = createStore<ID | null>(null);

persist({
  key: 'selected_wallet',
  store: $selectedWalletId,
  sync: true,
});

const $selectedWallet = combine(walletModel.$wallets, $selectedWalletId, (wallets, id) => {
  if (nullable(id)) return null;
  return wallets.find(wallet => wallet.id === id) ?? null;
});

const $selectedAccounts = combine($selectedWallet, accounts.$list, (wallet, accounts) => {
  if (nullable(wallet)) return [];

  return accountService.filterAccountsByWallet(accounts, wallet.id);
});

// direct selection
sample({
  clock: selectWallet,
  source: walletModel.$wallets,
  filter: (wallets, id) => nonNullable(wallets.find(w => w.id === id)),
  fn: (_, id) => id,
  target: $selectedWalletId,
});

// setting default selection if something went wrong
sample({
  clock: walletModel.$wallets,
  source: $selectedWalletId,
  filter: (id, wallets) => nullable(id) || (wallets.length > 0 && nullable(wallets.find(w => w.id === id))),
  fn: (id, wallets) => wallets.at(0)?.id ?? id,
  target: $selectedWalletId,
});

export const walletSelect = {
  $selectedWallet,
  $selectedWalletId: readonly($selectedWalletId),
  $selectedAccounts,
  select: selectWallet,

  __test: {
    $selectedWalletId,
  },
};
