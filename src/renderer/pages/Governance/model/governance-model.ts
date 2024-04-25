import { createStore } from 'effector';

const $store = createStore<string>('');

export const governanceModel = {
  store: $store,
};
