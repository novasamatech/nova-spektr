import { createEvent, createStore, sample } from 'effector';

import { SignatoryInfo } from '../lib/types';

const signatoriesChanged = createEvent<SignatoryInfo>();
const $signatories = createStore<Map<number, Omit<SignatoryInfo, 'index'>>>(new Map([[0, { name: '', address: '' }]]));

sample({
  clock: signatoriesChanged,
  source: $signatories,
  fn: (signatories, { index, name, address }) => {
    signatories.set(index, { name, address });

    // we need to return new Map to trigger re-render
    return new Map(signatories);
  },
  target: $signatories,
});

export const signatoryModel = {
  $signatories,
  events: {
    signatoriesChanged,
  },
};
