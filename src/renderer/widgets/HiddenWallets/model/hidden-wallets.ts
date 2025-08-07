import { combine, createEvent, createStore, restore, sample } from 'effector';
import { debounce } from 'patronum';

import { type Wallet } from '@/shared/core';
import { walletModel, walletUtils } from '@/entities/wallet';

const $hiddenWallets = walletModel.$hiddenWallets;

const $regularMultisigs = $hiddenWallets.map((wallets) =>
  wallets.filter((wallet) => walletUtils.isRegularMultisig(wallet)),
);

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

const $selectedWallet = createStore<Set<Wallet>>(new Set()).reset(clearSelection);

sample({
  clock: toggleWalletSelection,
  source: $selectedWallet,
  fn: (selected, wallet) => {
    const newSelected = new Set(selected);

    if (newSelected.has(wallet)) {
      newSelected.delete(wallet);
    } else {
      newSelected.add(wallet);
    }
    return newSelected;
  },
  target: $selectedWallet,
});

sample({
  clock: toggleGroupSelection,
  source: $selectedWallet,
  fn: (selected, groupWalletIds) => {
    const newSelected = new Set(selected);
    const allSelected = groupWalletIds.every((id) => newSelected.has(id));

    for (const id of groupWalletIds) {
      allSelected ? newSelected.delete(id) : newSelected.add(id);
    }

    return newSelected;
  },
  target: $selectedWallet,
});

sample({
  clock: toggleAllSelection,
  source: { selectedIds: $selectedWallet, wallets: $regularMultisigs },
  fn: ({ selectedIds, wallets }) => {
    return selectedIds.size === wallets.length ? new Set<Wallet>() : new Set(wallets);
  },
  target: $selectedWallet,
});

const $selectionState = combine($selectedWallet, $regularMultisigs, (selectedIds, wallets) => {
  const totalWallets = wallets.length;
  const selectedCount = selectedIds.size;

  return {
    selectedWalletIds: Array.from(selectedIds), // Convert Set to Array for UI compatibility
    selectedCount,
    totalWallets,
    allSelected: selectedCount > 0 && selectedCount === totalWallets,
    noneSelected: selectedCount === 0,
    someSelected: selectedCount > 0 && selectedCount < totalWallets,
  };
});

sample({
  clock: restoreWallets,
  source: $selectedWallet,
  fn: (selectedIds) => Array.from(selectedIds),
  target: walletModel.restoreWallets,
});

sample({
  clock: restoreWallets,
  fn: () => new Set<Wallet>(),
  target: $selectedWallet,
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
  $regularMultisigs,
  $selectedWalletIds: $selectedWallet,
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
