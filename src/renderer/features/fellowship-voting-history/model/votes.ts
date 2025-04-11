import { combine, sample } from 'effector';
import { createGate } from 'effector-react';
import { and, or } from 'patronum';

import { attachToFeatureInput } from '@/shared/feature';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { voting } from '@/domains/collectives';

import { fellowshipVotingHistoryFeature } from './feature';
import { fellowshipModel } from './fellowship';

const gate = createGate<{ referendumId: ReferendumId }>();

const $voting = fellowshipModel.$store.map(store => store?.voting ?? []);
const $votesList = combine($voting, gate.state, (votes, { referendumId }) => {
  if (nullable(referendumId)) return [];

  return votes.filter(vote => vote.referendumId === referendumId) ?? [];
});

sample({
  clock: attachToFeatureInput(fellowshipVotingHistoryFeature, gate.open),
  filter: ({ data: { referendumId } }) => nonNullable(referendumId),
  fn: ({ data: { referendumId }, input }) => ({ ...input, referendums: [referendumId] }),
  target: voting.request,
});

const $hasPendingRequest = and(
  $votesList.map(v => v.length === 0),
  voting.pending,
);

export const votesModel = {
  $votesList,
  $pending: or($hasPendingRequest, fellowshipVotingHistoryFeature.isStarting),

  gate,
};
