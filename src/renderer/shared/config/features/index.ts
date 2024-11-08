import { createStore } from 'effector';
import { readonly } from 'patronum';

import { isDev } from '@/shared/lib/utils';

export const $features = readonly(
  createStore({
    assets: true,
    staking: true,
    governance: true,
    // TODO: Dev only
    fellowship: isDev(),
    operations: true,
    contacts: true,
    notifications: true,
    settings: true,
  }),
);
