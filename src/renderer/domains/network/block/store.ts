import { type ApiPromise } from '@polkadot/api';
import { attach, createEffect, createEvent, createStore, sample } from 'effector';
import { interval } from 'patronum';

import { type HexString } from '@/shared/core';
import { getCurrentBlockNumber } from '@/shared/lib/utils';
import { type BlockHeight, pjsSchema } from '@/shared/polkadotjs-schemas';
import { networkModel } from '@/entities/network';

export const $apis = networkModel.$apis;

// Store mapping network IDs to their current block heights
const $currentBlockMap = createStore<Record<HexString, BlockHeight>>({});

const startBlockListening = createEvent();
const stopBlockListening = createEvent();

// Create an effect factory for getting a block for a specific network
const getBlockForNetworkFx = attach({
  effect: createEffect(async ({ networkId, api }: { networkId: HexString; api: ApiPromise }) => {
    try {
      const blockNumber = await getCurrentBlockNumber(api);
      return {
        networkId,
        blockHeight: pjsSchema.helpers.toBlockHeight(blockNumber),
      };
    } catch (error) {
      console.error(`Failed to get block for network ${networkId}:`, error);
      throw error;
    }
  }),
});

// Set up interval to check block numbers
const { tick } = interval({
  start: startBlockListening,
  stop: stopBlockListening,
  timeout: 6000,
  leading: true,
});

// Start listening when there are APIs available
sample({
  source: $apis,
  filter: apis => Object.keys(apis).length > 0,
  target: startBlockListening,
});

// On each tick, iterate through available APIs and trigger individual requests
sample({
  clock: tick,
  source: $apis,
  fn: apis => Object.entries(apis) as [HexString, ApiPromise][],
  target: createEffect((entries: [HexString, ApiPromise][]) => {
    for (const [networkId, api] of entries) {
      getBlockForNetworkFx({ networkId, api });
    }
  }),
});

// Update block map when any network's block height is fetched
sample({
  clock: getBlockForNetworkFx.doneData,
  source: $currentBlockMap,
  fn: (blockMap, { networkId, blockHeight }) => ({
    ...blockMap,
    [networkId]: blockHeight,
  }),
  target: $currentBlockMap,
});

export const block = {
  $currentBlockMap,
  startBlockListening,
  stopBlockListening,
};
