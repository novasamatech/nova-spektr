import { combine, sample } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';
import { ERROR } from '../constants';

const $input = combine(
  {
    network: fellowshipNetwork.$network,
    connected: fellowshipNetwork.$isConnected,
  },
  ({ network, connected }) => {
    if (nullable(network)) return null;

    return { ...network, connected };
  },
);

export const fellowshipMembersFeature = createFeature({
  name: 'fellowship/members',
  enable: $features.map(({ fellowship }) => fellowship),
  input: $input,
  filter: input => {
    if (input.connected) return null;

    return {
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
