import { createStore } from 'effector';
import { readonly } from 'patronum';

export const $features = readonly(
  createStore({
    assets: true,
    staking: true,
    governance: true,
    fellowship: true,
    operations: true,
    contacts: true,
    notifications: true,
    settings: true,
  }),
);
