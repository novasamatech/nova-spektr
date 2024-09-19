import { sample } from 'effector';

import { createFeature } from '@/shared/effector';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';
import { error } from '../constants';

export const membersFeatureStatus = createFeature(fellowshipNetworkFeature.model.network.$network);

sample({
  clock: fellowshipNetworkFeature.model.network.$isActive,
  filter: fellowshipNetworkFeature.model.network.$isActive,
  target: membersFeatureStatus.restore,
});

sample({
  clock: [fellowshipNetworkFeature.model.network.$isDisconnected, membersFeatureStatus.start],
  filter: fellowshipNetworkFeature.model.network.$isDisconnected,
  fn: () => new Error(error.networkDisabled),
  target: membersFeatureStatus.fail,
});
