import { createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

import { authModel } from './auth-model';
import { backendConfigurationModel } from './backend-configuration-model';

const $hasEverConnected = createStore(false);

persist({
  key: 'address-book-has-ever-connected',
  store: $hasEverConnected,
  sync: true,
});

sample({
  clock: authModel.$authState,
  filter: state => state !== null,
  fn: () => true,
  target: $hasEverConnected,
});

$hasEverConnected.on(backendConfigurationModel.events.urlCleared, () => false);

export const connectionHistoryModel = {
  $hasEverConnected,
};
