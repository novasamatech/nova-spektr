import { sample } from 'effector';

import { createFeature } from '@shared/effector';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';
import { error } from '../constants';

export const referendumsFeatureStatus = createFeature(fellowshipNetworkFeature.model.network.$network);

sample({
  clock: fellowshipNetworkFeature.model.network.$isActive,
  filter: fellowshipNetworkFeature.model.network.$isActive,
  target: referendumsFeatureStatus.restore,
});

sample({
  clock: [fellowshipNetworkFeature.model.network.$isDisconnected, referendumsFeatureStatus.start],
  filter: fellowshipNetworkFeature.model.network.$isDisconnected,
  fn: () => new Error(error.networkDisabled),
  target: referendumsFeatureStatus.fail,
});
