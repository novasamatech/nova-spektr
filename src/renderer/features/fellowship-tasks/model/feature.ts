import { combine, sample } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { feed, referendum } from '@/domains/collectives';
import { fellowshipMember } from '@/aggregates/fellowship-member';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';
import { ERROR } from '../constants';

const $input = combine(
  {
    network: fellowshipNetwork.$network,
    member: fellowshipMember.$currentMember,
    account: fellowshipMember.$currentMemberAccount,
  },
  ({ network, member, account }) => {
    if (nullable(network)) return null;

    return {
      api: network.api,
      asset: network.asset,
      chain: network.chain,
      chainId: network.chainId,
      palletType: network.palletType,
      member,
      account,
    };
  },
);

export const fellowshipTasksFeature = createFeature({
  name: 'fellowship/tasks',
  enable: $features.map(({ fellowship }) => fellowship),
  input: $input,
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
  target: fellowshipTasksFeature.restore,
});

sample({
  clock: fellowshipTasksFeature.running,
  target: feed.subscribe,
});

sample({
  clock: fellowshipTasksFeature.running,
  target: referendum.requestReferendumsWithEvidence,
});

sample({
  clock: fellowshipTasksFeature.stopped,
  target: feed.unsubscribe,
});
