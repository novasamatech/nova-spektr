import { combine, createEvent, createStore, restore, sample } from 'effector';
import { debounce } from 'patronum';

import { type Wallet } from '@/shared/core';
import { walletModel } from '@/entities/wallet';

const $hiddenWallets = walletModel.$hiddenWallets;

// Events
const changeQuery = createEvent<string>();
const restoreWallets = createEvent();
const walletsRestored = createEvent();
const clearSelection = createEvent();
const toggleWalletSelection = createEvent<Wallet>();
const toggleGroupSelection = createEvent<Wallet[]>();
const toggleAllSelection = createEvent();

const $inputQuery = restore(changeQuery, '').reset(clearSelection);

// Debounced query for expensive search operations (300ms delay)
const $query = restore(debounce(changeQuery, 300), '').reset(clearSelection);

const $selectedWallets = createStore<Set<Wallet['id']>>(new Set()).reset(clearSelection);

sample({
  clock: toggleWalletSelection,
  source: $selectedWallets,
  fn: (selected, wallet) => {
    const newSelected = new Set(selected);
    const walletId = wallet.id;

    if (newSelected.has(walletId)) {
      newSelected.delete(walletId);
    } else {
      newSelected.add(walletId);
    }
    return newSelected;
  },
  target: $selectedWallets,
});

sample({
  clock: toggleGroupSelection,
  source: $selectedWallets,
  fn: (selected, groupWallets) => {
    const newSelected = new Set(selected);
    const allSelected = groupWallets.every((wallet) => newSelected.has(wallet.id));

    for (const wallet of groupWallets) {
      allSelected ? newSelected.delete(wallet.id) : newSelected.add(wallet.id);
    }

    return newSelected;
  },
  target: $selectedWallets,
});

sample({
  clock: toggleAllSelection,
  source: { selectedWallets: $selectedWallets, wallets: $hiddenWallets },
  fn: ({ selectedWallets, wallets }) => {
    return selectedWallets.size === wallets.length
      ? new Set<Wallet['id']>()
      : new Set(wallets.map((wallet) => wallet.id));
  },
  target: $selectedWallets,
});

const $selectionState = combine($selectedWallets, $hiddenWallets, (selectedWallets, wallets) => {
  const totalWallets = wallets.length;
  const selectedCount = selectedWallets.size;

  return {
    selectedWalletIds: Array.from(selectedWallets),
    selectedCount,
    totalWallets,
    allSelected: selectedCount > 0 && selectedCount === totalWallets,
    noneSelected: selectedCount === 0,
    someSelected: selectedCount > 0 && selectedCount < totalWallets,
  };
});

sample({
  clock: restoreWallets,
  source: { selectedWallets: $selectedWallets, hiddenWallets: $hiddenWallets },
  fn: ({ selectedWallets, hiddenWallets }) => {
    const selectedIds = new Set(selectedWallets);

    return hiddenWallets.filter((wallet) => selectedIds.has(wallet.id));
  },
  target: walletModel.restoreWallets,
});

sample({
  clock: restoreWallets,
  fn: () => new Set<Wallet['id']>(),
  target: $selectedWallets,
});

sample({
  clock: walletModel.restoreWallets.done,
  target: walletsRestored,
});

export const hiddenWalletsModel = {
  // Stores
  $hiddenWallets,
  $inputQuery, // For immediate UI feedback
  $query, // Debounced query for expensive operations
  $selectedWallets,
  $selectionState,

  // Events
  changeQuery,
  restoreWallets,
  walletsRestored,
  clearSelection,
  toggleWalletSelection,
  toggleGroupSelection,
  toggleAllSelection,
};
