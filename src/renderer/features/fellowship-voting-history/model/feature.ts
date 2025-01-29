import { sample } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';
import { ERROR } from '../constants';

export const votingHistoryFeatureStatus = createFeature({
  name: 'fellowship/voting history',
  enable: $features.map(({ fellowship }) => fellowship),
  input: fellowshipNetworkFeature.model.network.$network,
  filter: input => {
    if (input.api.isConnected) return null;

    return {
      status: 'failed',
      type: 'warning',
      error: new Error(ERROR.networkDisabled),
    };
  },
});

sample({
  clock: fellowshipNetworkFeature.model.network.$isActive,
  filter: fellowshipNetworkFeature.model.network.$isActive,
  target: votingHistoryFeatureStatus.restore,
});
