import { type ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { produce } from 'immer';
import { interval } from 'patronum';

import { type ChainId } from '@/shared/core';
import { series } from '@/shared/effector/series';
import { entries, getCurrentBlockNumber } from '@/shared/lib/utils';
import { type BlockHeight, pjsSchema } from '@/shared/polkadotjs-schemas';
import { networkModel } from '@/entities/network';

import { blockResource } from './resource';

export const $apis = networkModel.$apis;

// Store mapping chain IDs to their current block heights
const $currentBlock = createStore<Record<ChainId, BlockHeight>>({});

const startBlockListening = createEvent();
const stopBlockListening = createEvent();

// Create an effect factory for getting a block for a specific chain
const getBlockForChainFx = createEffect(async ({ chainId, api }: { chainId: ChainId; api: ApiPromise }) => {
  try {
    const blockNumber = await getCurrentBlockNumber(api);
    return {
      chainId,
      blockHeight: pjsSchema.helpers.toBlockHeight(blockNumber),
    };
  } catch (error) {
    console.error(`Failed to get block for chain ${chainId}:`, error);
  }
});

// Set up interval to check block numbers
const { tick } = interval({
  start: startBlockListening,
  stop: stopBlockListening,
  timeout: 60000,
  leading: true,
});

// Start listening when there are APIs available
sample({
  source: $apis,
  filter: apis => Object.keys(apis).length > 0,
  target: [stopBlockListening, startBlockListening],
});

// On each tick, use series to trigger requests for all APIs
sample({
  clock: tick,
  source: $apis,
  fn: apis => entries(apis).map(([chainId, api]) => ({ chainId, api })),
  target: series(getBlockForChainFx, { parallel: true }),
});

// Update block map when any chain's block height is fetched
sample({
  clock: getBlockForChainFx.doneData,
  source: $currentBlock,
  fn: (blockMap, data) =>
    produce(blockMap, draft => {
      if (!data) return;

      const { chainId, blockHeight } = data;
      draft[chainId] = blockHeight;
    }),
  target: $currentBlock,
});

export const block = {
  blockResource,
  $currentBlock,
  startBlockListening,
  stopBlockListening,
};
