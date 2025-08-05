import { combine, createEvent, createStore, restore, sample } from 'effector';

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

const $query = restore(changeQuery, '').reset(clearSelection);

const $selectedWalletIds = createStore<ID[]>([])
  .on(toggleWalletSelection, (selected, walletId) => {
    return selected.includes(walletId) ? selected.filter((id) => id !== walletId) : [...selected, walletId];
  })
  .on(toggleGroupSelection, (selected, groupWalletIds) => {
    const allSelected = groupWalletIds.every((id) => selected.includes(id));
    return allSelected
      ? selected.filter((id) => !groupWalletIds.includes(id))
      : [...selected, ...groupWalletIds.filter((id) => !selected.includes(id))];
  })
  .reset(clearSelection);

sample({
  clock: toggleAllSelection,
  source: { selectedIds: $selectedWalletIds, wallets: $regularMultisigs },
  fn: ({ selectedIds, wallets }) => {
    const allWalletIds = wallets.map((w) => w.id);
    return selectedIds.length === allWalletIds.length ? [] : allWalletIds;
  },
  target: $selectedWalletIds,
});

const $selectionState = combine($selectedWalletIds, $regularMultisigs, (selectedIds, wallets) => {
  const totalWallets = wallets.length;
  const selectedCount = selectedIds.length;

  return {
    selectedWalletIds: selectedIds,
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
  target: walletModel.events.walletsRestored,
});

sample({
  clock: walletModel.events.walletsRestoredSuccess,
  target: walletsRestored,
});

export const hiddenWalletsModel = {
  // Stores
  $hiddenWallets,
  $query,
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
