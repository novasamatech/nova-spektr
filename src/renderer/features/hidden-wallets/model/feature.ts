import { createStore } from 'effector';

import { createFeature } from '@/shared/feature';

const $enable = createStore(true);

export const hiddenWalletsFeature = createFeature({
  name: 'wallets/hidden',
  enable: $enable,
});
