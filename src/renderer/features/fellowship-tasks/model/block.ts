import { createEffect, createEvent, createStore, sample } from 'effector';
import { interval } from 'patronum';

import { attachToFeatureInput } from '@/shared/feature';
import { getCurrentBlockNumber } from '@/shared/lib/utils';
import { type BlockHeight, pjsSchema } from '@/shared/polkadotjs-schemas';

import { fellowshipTasksFeature } from './feature';

const $currentBlock = createStore<BlockHeight>(pjsSchema.helpers.toBlockHeight(1));
const startBlockListening = createEvent();
const stopBlockListening = createEvent();

const getBlockFx = createEffect(getCurrentBlockNumber);

const { tick } = interval({
  start: startBlockListening,
  stop: stopBlockListening,
  timeout: 60 * 1000,
  leading: true,
});

sample({
  clock: fellowshipTasksFeature.running,
  target: startBlockListening,
});

sample({
  clock: fellowshipTasksFeature.stopped,
  target: stopBlockListening,
});

sample({
  clock: attachToFeatureInput(fellowshipTasksFeature, tick),
  fn({ input: { api } }) {
    return api;
  },
  target: getBlockFx,
});

sample({
  clock: getBlockFx.doneData,
  fn: pjsSchema.helpers.toBlockHeight,
  target: $currentBlock,
});

export const block = {
  $currentBlock,
};
