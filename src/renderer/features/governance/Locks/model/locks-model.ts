import { createStore } from 'effector';

const $test = createStore<string>('');

export const locksModel = {
  $test,
};
