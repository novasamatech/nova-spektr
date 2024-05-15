import { createStore } from 'effector';

const $test = createStore<string>('');

export const chainSelectorModel = {
  $test,
};
