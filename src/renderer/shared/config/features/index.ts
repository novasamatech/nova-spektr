import { createStore } from 'effector';
import { readonly } from 'patronum';

export const $features = readonly(
  createStore({
    assets: true,
    staking: true,
    governance: true,
    // TODO: Dev only
    fellowship: true,
    operations: true,
    contacts: true,
    notifications: true,
    settings: true,
  }),
);
