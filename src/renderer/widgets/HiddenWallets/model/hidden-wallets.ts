import { combine, createEvent, createStore, restore, sample } from 'effector';
import { debounce } from 'patronum';

import { type ID } from '@/shared/core';
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
const toggleWalletSelection = createEvent<ID>();
const toggleGroupSelection = createEvent<ID[]>();
const toggleAllSelection = createEvent();

const $inputQuery = restore(changeQuery, '').reset(clearSelection);

// Debounced query for expensive search operations (300ms delay)
const $query = restore(debounce(changeQuery, 300), '').reset(clearSelection);

const $selectedWalletIds = createStore<Set<ID>>(new Set())
  .on(toggleWalletSelection, (selected, walletId) => {
    const newSelected = new Set(selected);
    if (newSelected.has(walletId)) {
      newSelected.delete(walletId);
    } else {
      newSelected.add(walletId);
    }
    return newSelected;
  })
  .on(toggleGroupSelection, (selected, groupWalletIds) => {
    const newSelected = new Set(selected);
    const allSelected = groupWalletIds.every((id) => newSelected.has(id));

    if (allSelected) {
      for (const id of groupWalletIds) {
        newSelected.delete(id);
      }
    } else {
      for (const id of groupWalletIds) {
        newSelected.add(id);
      }
    }
    return newSelected;
  })
  .reset(clearSelection);

sample({
  clock: toggleAllSelection,
  source: { selectedIds: $selectedWalletIds, wallets: $regularMultisigs },
  fn: ({ selectedIds, wallets }) => {
    const allWalletIds = wallets.map((w) => w.id);
    return selectedIds.size === allWalletIds.length ? new Set<ID>() : new Set(allWalletIds);
  },
  target: $selectedWalletIds,
});

const $selectionState = combine($selectedWalletIds, $regularMultisigs, (selectedIds, wallets) => {
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
  source: $selectedWalletIds,
  fn: (selectedIds) => Array.from(selectedIds),
  target: walletModel.events.walletsRestored,
});

sample({
  clock: walletModel.events.walletsRestoredSuccess,
  target: walletsRestored,
});

export const hiddenWalletsModel = {
  // Stores
  $hiddenWallets,
  $inputQuery, // For immediate UI feedback
  $query, // Debounced query for expensive operations
  $regularMultisigs,
  $selectedWalletIds,
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
