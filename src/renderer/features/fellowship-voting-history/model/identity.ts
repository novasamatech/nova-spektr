import { combine, sample } from 'effector';

import { attachToFeatureInput } from '@/shared/feature';
import { identity } from '@/domains/network';

import { fellowshipVotingHistoryFeature } from './feature';
import { votesModel } from './votes';

const votesUpdate = attachToFeatureInput(fellowshipVotingHistoryFeature, votesModel.$votesList);

const $identity = combine(identity.$list, fellowshipVotingHistoryFeature.state, (list, state) => {
  if (state.status !== 'running') return {};

  return list[state.data.chainId] ?? {};
});

sample({
  clock: votesUpdate,
  fn: ({ input: { chainId }, data: votes }) => ({
    accounts: votes.map(m => m.accountId),
    chainId,
  }),
  target: identity.request,
});

export const identityModel = {
  $identity,
};
