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

/**
 * The active wallet actually changed.
 *
 * Fires on a real switch only: `select` called with the id already held leaves
 * the store untouched and this silent, so consumers can treat it as "the user
 * is now on a different wallet" rather than "the selector was clicked".
 *
 * Published as a named event because the store above it is exported through
 * `readonly()` — a derived store, whose `.updates` is not a safe `sample`
 * clock: emission tracking on derived stores is not scope-local under `fork()`,
 * so such a clock passes in isolation and silently stops firing once other
 * tests in the same suite have forked the module. Clocking this event instead
 * keeps the trigger on the source store where it belongs.
 */
const walletSwitched = $selectedWalletId.updates;

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
  walletSwitched,

  __test: {
    $selectedWalletId,
  },
};
