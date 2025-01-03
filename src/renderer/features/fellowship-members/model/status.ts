import { sample } from 'effector';

import { createFeature } from '@/shared/effector';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';
import { ERROR } from '../constants';

export const membersFeatureStatus = createFeature({
  name: 'fellowship/members',
  input: fellowshipNetworkFeature.model.network.$network,
  filter: input => {
    return input.api.isConnected
      ? null
      : {
          status: 'failed',
          type: 'warning',
          error: new Error(ERROR.networkDisabled),
        };
  },
});

sample({
  clock: fellowshipNetworkFeature.model.network.$isActive,
  filter: fellowshipNetworkFeature.model.network.$isActive,
  target: membersFeatureStatus.restore,
});
