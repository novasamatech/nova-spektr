import { createEffect, createEvent, createStore, sample } from 'effector';

import { localStorageService } from '@/shared/api/local-storage';
import { type ChainId } from '@/shared/core';
import { RelayChains } from '@/shared/lib/utils/constants';
import { block } from '@/domains/network';

// Migration block numbers when AssetHub migration alerts should start showing
const KUSAMA_MIGRATION_BLOCK = 28026491;
const POLKADOT_MIGRATION_BLOCK = 28026491;

// Hide alert after 5,000,000 blocks (~347 days)
const HIDE_AFTER_BLOCKS = 5_000_000;

const KUSAMA_STORAGE_KEY = 'assethub_migration_modal_seen_kusama';
const POLKADOT_STORAGE_KEY = 'assethub_migration_modal_seen_polkadot';

const POLKADOT_CHAIN_ID = RelayChains.POLKADOT;
const KUSAMA_CHAIN_ID = RelayChains.KUSAMA;

const closeModal = createEvent();

const $isModalOpen = createStore(false);
const $chainName = createStore<ChainId>(POLKADOT_CHAIN_ID);
const $modalState = createStore<{ shouldShow: boolean; chainId: ChainId }>({
  shouldShow: false,
  chainId: POLKADOT_CHAIN_ID,
});

const saveSeenModalFx = createEffect((storageKey: string): boolean => {
  return localStorageService.saveToStorage(storageKey, true);
});

const hasSeenModal = (chainId: ChainId): boolean => {
  const storageKey = chainId === KUSAMA_CHAIN_ID ? KUSAMA_STORAGE_KEY : POLKADOT_STORAGE_KEY;
  return localStorageService.getFromStorage(storageKey, false);
};

const isInMigrationWindow = (currentBlockNumber: number | undefined, migrationBlock: number): boolean => {
  if (!currentBlockNumber) return false;
  return currentBlockNumber >= migrationBlock && currentBlockNumber <= migrationBlock + HIDE_AFTER_BLOCKS;
};

const shouldShowModal = (blockNumbers: Record<ChainId, number>): { shouldShow: boolean; chainId: ChainId } => {
  const polkadotBlock = blockNumbers[POLKADOT_CHAIN_ID];
  const kusamaBlock = blockNumbers[KUSAMA_CHAIN_ID];

  if (
    polkadotBlock &&
    isInMigrationWindow(polkadotBlock, POLKADOT_MIGRATION_BLOCK) &&
    !hasSeenModal(POLKADOT_CHAIN_ID)
  ) {
    return { shouldShow: true, chainId: POLKADOT_CHAIN_ID };
  }

  if (kusamaBlock && isInMigrationWindow(kusamaBlock, KUSAMA_MIGRATION_BLOCK) && !hasSeenModal(KUSAMA_CHAIN_ID)) {
    return { shouldShow: true, chainId: KUSAMA_CHAIN_ID };
  }

  return { shouldShow: false, chainId: POLKADOT_CHAIN_ID };
};

sample({
  clock: [block.$currentBlock, closeModal],
  source: block.$currentBlock,
  filter: (blockNumbers: Record<ChainId, number>) => {
    const hasPolkadotBlock = blockNumbers[POLKADOT_CHAIN_ID] !== undefined;
    const hasKusamaBlock = blockNumbers[KUSAMA_CHAIN_ID] !== undefined;
    return hasPolkadotBlock && hasKusamaBlock;
  },
  fn: shouldShowModal,
  target: $modalState,
});

sample({
  clock: $modalState,
  fn: ({ shouldShow }) => shouldShow,
  target: $isModalOpen,
});

sample({
  clock: $modalState,
  fn: ({ chainId }) => chainId,
  target: $chainName,
});

const closePolkadotModal = createEvent();
const closeKusamaModal = createEvent();

sample({
  clock: closeModal,
  source: $chainName,
  filter: (chainId: ChainId) => chainId === POLKADOT_CHAIN_ID,
  target: closePolkadotModal,
});

sample({
  clock: closeModal,
  source: $chainName,
  filter: (chainId: ChainId) => chainId === KUSAMA_CHAIN_ID,
  target: closeKusamaModal,
});

sample({
  clock: closePolkadotModal,
  fn: () => POLKADOT_STORAGE_KEY,
  target: saveSeenModalFx,
});

// Mark Kusama modal as seen when Polkadot modal is closed (per requirements)
sample({
  clock: closePolkadotModal,
  fn: () => KUSAMA_STORAGE_KEY,
  target: saveSeenModalFx,
});

sample({
  clock: closeKusamaModal,
  fn: () => KUSAMA_STORAGE_KEY,
  target: saveSeenModalFx,
});

export const migrationModalModel = {
  $isModalOpen,
  $chainName,
  events: {
    closeModal,
  },
};
