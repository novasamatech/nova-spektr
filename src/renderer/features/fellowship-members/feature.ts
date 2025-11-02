import { sample } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

import { ERROR } from './constants';

export const fellowshipMembersFeature = createFeature({
  name: 'fellowship/members',
  enable: $features.map(({ fellowship }) => fellowship),
  input: fellowshipNetwork.$network,
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
  clock: fellowshipNetwork.$isConnected,
  filter: fellowshipNetwork.$isConnected,
  target: fellowshipMembersFeature.restore,
});
