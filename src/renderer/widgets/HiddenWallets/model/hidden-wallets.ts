import { combine, createEvent, createStore, restore, sample } from 'effector';

import { type ID } from '@/shared/core';
import { walletModel, walletUtils } from '@/entities/wallet';

const $hiddenWallets = walletModel.$hiddenWallets;

const $regularMultisigs = $hiddenWallets.map((wallets) =>
  wallets.filter((wallet) => walletUtils.isRegularMultisig(wallet)),
);

const clearSelection = createEvent();
const restoreWallets = createEvent();
const walletsRestored = createEvent();

const changeQuery = createEvent<string>();
const $query = restore(changeQuery, '').reset(clearSelection);

// Selection state management
const toggleWalletSelection = createEvent<ID>();
const toggleGroupSelection = createEvent<ID[]>();
const toggleAllSelection = createEvent();

const $selectedWalletIds = createStore<ID[]>([])
  .on(toggleWalletSelection, (selected, walletId) =>
    selected.includes(walletId) ? selected.filter((id) => id !== walletId) : [...selected, walletId],
  )
  .on(toggleGroupSelection, (selected, groupWalletIds) => {
    const allGroupSelected = groupWalletIds.every((id) => selected.includes(id));
    if (allGroupSelected) {
      return selected.filter((id) => !groupWalletIds.includes(id));
    } else {
      const newIds = groupWalletIds.filter((id) => !selected.includes(id));
      return [...selected, ...newIds];
    }
  })
  .reset(clearSelection);

// Handle toggle all selection with sample
sample({
  clock: toggleAllSelection,
  source: { selectedIds: $selectedWalletIds, wallets: $regularMultisigs },
  fn: ({ selectedIds, wallets }) => {
    const allWalletIds = wallets.map((w) => w.id);
    const allSelected = allWalletIds.length > 0 && allWalletIds.every((id) => selectedIds.includes(id));
    return allSelected ? [] : allWalletIds;
  },
  target: $selectedWalletIds,
});

// Computed selection state
const $selectionState = combine($selectedWalletIds, $regularMultisigs, (selectedIds, wallets) => {
  const totalWallets = wallets.length;
  const selectedCount = selectedIds.filter((id) => wallets.some((wallet) => wallet.id === id)).length;

  return {
    selectedWalletIds: selectedIds,
    allSelected: selectedCount === totalWallets && totalWallets > 0,
    noneSelected: selectedCount === 0,
    someSelected: selectedCount > 0 && selectedCount < totalWallets,
    selectedCount,
    totalWallets,
  };
});

sample({
  clock: restoreWallets,
  source: $selectedWalletIds,
  fn: (selectedWalletIds) => selectedWalletIds,
  target: walletModel.events.walletsRestored,
});

sample({
  clock: walletModel.events.walletsRestoredSuccess,
  target: walletsRestored,
});

export const hiddenWalletsModel = {
  $hiddenWallets,
  $query,
  $regularMultisigs,
  $selectedWalletIds,
  $selectionState,

  //events
  changeQuery,
  restoreWallets,
  toggleWalletSelection,
  toggleGroupSelection,
  toggleAllSelection,
  clearSelection,
  walletsRestored,
};
