import { createEffect, createEvent, createStore, sample } from 'effector';
import { interval } from 'patronum';

import { type ChainId } from '@/shared/core';
import { attachToFeatureInput } from '@/shared/feature';
import { papiSchema } from '@/shared/papi-schemas';
import { type BlockHeight, pjsSchema } from '@/shared/polkadotjs-schemas';
import { getChainRegistry } from '@/domains/network';

import { fellowshipSalaryFeature } from './feature';

const $currentBlock = createStore<BlockHeight>(pjsSchema.helpers.toBlockHeight(1));
const startBlockListening = createEvent();
const stopBlockListening = createEvent();

const getBlockNumberFx = createEffect(async (chainId: ChainId) => {
  const block = await getChainRegistry().getFinalizedBlock(chainId);

  return block.number;
});

const { tick } = interval({
  start: startBlockListening,
  stop: stopBlockListening,
  timeout: 6000,
  leading: true,
});

sample({
  clock: fellowshipSalaryFeature.running,
  target: startBlockListening,
});

sample({
  clock: fellowshipSalaryFeature.stopped,
  target: stopBlockListening,
});

sample({
  clock: attachToFeatureInput(fellowshipSalaryFeature, tick),
  fn: ({ input: { chainId } }) => chainId,
  target: getBlockNumberFx,
});

sample({
  clock: getBlockNumberFx.doneData,
  fn: papiSchema.helpers.toBlockHeight,
  target: $currentBlock,
});

export const block = {
  $currentBlock,
};
