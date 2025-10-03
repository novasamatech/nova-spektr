import { combine, createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

import { type ChainId } from '@/shared/core';
import { block } from '@/domains/network';

import {
  HIDE_AFTER_BLOCKS,
  KUSAMA_CHAIN_ID,
  KUSAMA_MIGRATION_BLOCK,
  POLKADOT_CHAIN_ID,
  POLKADOT_MIGRATION_BLOCK,
} from './constants';

const closeModal = createEvent();

const $seenPolkadot = createStore(false);
const $seenKusama = createStore(false);

persist({
  key: 'assethub_migration_modal_seen_polkadot',
  store: $seenPolkadot,
  sync: true,
});

persist({
  key: 'assethub_migration_modal_seen_kusama',
  store: $seenKusama,
  sync: true,
});

const isInMigrationWindow = (currentBlockNumber: number | undefined, migrationBlock: number): boolean => {
  if (!currentBlockNumber) return false;
  return currentBlockNumber >= migrationBlock && currentBlockNumber <= migrationBlock + HIDE_AFTER_BLOCKS;
};

const $seenStates = combine($seenPolkadot, $seenKusama, (seenPolkadot, seenKusama) => ({
  seenPolkadot,
  seenKusama,
}));

const $modalState = combine(
  block.$currentBlock,
  $seenStates,
  (blockNumbers, { seenPolkadot, seenKusama }): { shouldShow: boolean; chainId: ChainId } => {
    const polkadotBlock = blockNumbers[POLKADOT_CHAIN_ID];
    const kusamaBlock = blockNumbers[KUSAMA_CHAIN_ID];

    if (polkadotBlock && kusamaBlock) {
      const isPolkadotMigrating = isInMigrationWindow(polkadotBlock, POLKADOT_MIGRATION_BLOCK) && !seenPolkadot;
      const isKusamaMigrating = isInMigrationWindow(kusamaBlock, KUSAMA_MIGRATION_BLOCK) && !seenKusama;

      if (isPolkadotMigrating) {
        return { shouldShow: true, chainId: POLKADOT_CHAIN_ID };
      }

      if (isKusamaMigrating) {
        return { shouldShow: true, chainId: KUSAMA_CHAIN_ID };
      }
    }

    return { shouldShow: false, chainId: POLKADOT_CHAIN_ID };
  },
);

const $isModalOpen = $modalState.map(({ shouldShow }) => shouldShow);
const $chainId = $modalState.map(({ chainId }) => chainId);

sample({
  clock: closeModal,
  source: $chainId,
  filter: (chainId: ChainId) => chainId === POLKADOT_CHAIN_ID,
  fn: () => true,
  target: [$seenPolkadot, $seenKusama],
});

sample({
  clock: closeModal,
  source: $chainId,
  filter: (chainId: ChainId) => chainId === KUSAMA_CHAIN_ID,
  fn: () => true,
  target: [$seenKusama],
});

export const migrationModalModel = {
  $isModalOpen,
  $chainId,
  closeModal,
};
