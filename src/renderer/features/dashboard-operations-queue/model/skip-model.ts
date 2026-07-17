import { createEvent, createStore } from 'effector';
import { persist } from 'effector-storage/local';

const SKIPPED_STORAGE_KEY = 'spektr_queue_skipped_v1';

const skip = createEvent<string>();
const unskip = createEvent<string>();

const $skipped = createStore<string[]>([])
  .on(skip, (state, key) => (state.includes(key) ? state : [...state, key]))
  .on(unskip, (state, key) => state.filter((existing) => existing !== key));

persist({ key: SKIPPED_STORAGE_KEY, store: $skipped, sync: true });

export const skipModel = {
  $skipped,
  skip,
  unskip,
};
