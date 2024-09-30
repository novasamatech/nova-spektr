import { sample } from 'effector';

import { createFeature } from '@shared/effector';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';
import { error } from '../constants';

export const profileFeatureStatus = createFeature({
  name: 'profile',
  input: fellowshipNetworkFeature.model.network.$network,
});

sample({
  clock: fellowshipNetworkFeature.model.network.$isActive,
  filter: fellowshipNetworkFeature.model.network.$isActive,
  target: profileFeatureStatus.restore,
});

sample({
  clock: [fellowshipNetworkFeature.model.network.$isDisconnected, profileFeatureStatus.start],
  filter: fellowshipNetworkFeature.model.network.$isDisconnected,
  fn: () => ({ type: 'warning' as const, error: new Error(error.networkDisabled) }),
  target: profileFeatureStatus.fail,
});
