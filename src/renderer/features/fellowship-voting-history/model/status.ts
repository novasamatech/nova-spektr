import { sample } from 'effector';

import { createFeature } from '@/shared/effector';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';
import { ERROR } from '../constants';

export const votingHistoryFeatureStatus = createFeature({
  name: 'fellowship/voting history',
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
