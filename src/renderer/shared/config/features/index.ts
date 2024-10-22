import { createStore } from 'effector';
import { readonly } from 'patronum';

export const $features = readonly(
  createStore({
    fellowship: false,
  }),
);
