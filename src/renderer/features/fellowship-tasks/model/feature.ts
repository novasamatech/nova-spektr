import { combine, sample } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { feed } from '@/domains/collectives';
import { fellowshipMember } from '@/aggregates/fellowship-member';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';
import { ERROR } from '../constants';

const $input = combine(
  {
    network: fellowshipNetwork.$network,
    member: fellowshipMember.$currentMember,
    account: fellowshipMember.$currentMemberAccount,
    connected: fellowshipNetwork.$isConnected,
  },
  ({ network, ...rest }) => {
    if (nullable(network)) return null;

    return { ...network, ...rest };
  },
);

export const fellowshipTasksFeature = createFeature({
  name: 'fellowship/tasks',
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
  target: fellowshipTasksFeature.restore,
});

sample({
  clock: fellowshipTasksFeature.running,
  target: feed.subscribe,
});

sample({
  clock: fellowshipTasksFeature.stopped,
  target: feed.unsubscribe,
});
