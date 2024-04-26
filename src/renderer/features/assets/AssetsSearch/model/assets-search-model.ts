import { createEvent, createStore, sample } from 'effector';

const queryChanged = createEvent<string>();

const $query = createStore<string>('');

sample({
  clock: queryChanged,
  target: $query,
});

export const assetsSearchModel = {
  $query,
  events: {
    queryChanged,
  },
};
