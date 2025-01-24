import { sample } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';
import { ERROR } from '../constants';

export const fellowshipMembersFeature = createFeature({
  name: 'fellowship/members',
  enable: $features.map(({ fellowship }) => fellowship),
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
  target: fellowshipMembersFeature.restore,
});
