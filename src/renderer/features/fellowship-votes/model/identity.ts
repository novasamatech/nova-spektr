import { combine, sample } from 'effector';

import { attachToFeatureInput } from '@/shared/effector';
import { identityDomain } from '@/domains/identity';

import { votesFeatureStatus } from './status';
import { votesModel } from './votes';

const votesUpdate = attachToFeatureInput(votesFeatureStatus, votesModel.$votesList);

const $identity = combine(identityDomain.identity.$list, votesFeatureStatus.state, (list, state) => {
  if (state.status !== 'running') return {};

  return list[state.data.chainId] ?? {};
});

sample({
  clock: votesUpdate,
  fn: ({ input: { chainId }, data: votes }) => ({
    accounts: votes.map(m => m.accountId),
    chainId,
  }),
  target: identityDomain.identity.request,
});

export const identityModel = {
  $identity,
};
