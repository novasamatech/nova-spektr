import { createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

import { $features } from '@/shared/config/features';
import { authModel } from '@/aggregates/backend';

const $hasEverConnected = createStore(false);

persist({
  key: 'address-book-has-ever-connected',
  store: $hasEverConnected,
  sync: true,
});

sample({
  clock: authModel.$authState,
  filter: (state) => state !== null,
  fn: () => true,
  target: $hasEverConnected,
});

const $featureEnabled = $features.map((f) => f.addressBookStatus);

export const connectionStatusModel = {
  $hasEverConnected,
  $featureEnabled,
};
