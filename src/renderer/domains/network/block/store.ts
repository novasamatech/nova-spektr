import { type ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { produce } from 'immer';
import { interval } from 'patronum';

import { type ChainId } from '@/shared/core';
import { series } from '@/shared/effector/series';
import { entries, getCurrentBlockNumber } from '@/shared/lib/utils';
import { type BlockHeight, pjsSchema } from '@/shared/polkadotjs-schemas';
import { networkModel } from '@/entities/network';

import { blockResource, blockTimeResource } from './resource';

export const $apis = networkModel.$apis;

const $currentBlock = createStore<Record<ChainId, BlockHeight>>({});

const startBlockListening = createEvent();
const stopBlockListening = createEvent();

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

const { tick } = interval({
  start: startBlockListening,
  stop: stopBlockListening,
  timeout: 60000,
  leading: true,
});

sample({
  source: $apis,
  filter: apis => Object.keys(apis).length > 0,
  target: [stopBlockListening, startBlockListening],
});

sample({
  clock: tick,
  source: $apis,
  fn: apis => entries(apis).map(([chainId, api]) => ({ chainId, api })),
  target: series(getBlockForChainFx, { parallel: true }),
});

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
  blockTimeResource,
  $currentBlock,
  startBlockListening,
  stopBlockListening,
};
