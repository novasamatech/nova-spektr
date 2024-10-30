import { combine, sample } from 'effector';
import { createGate } from 'effector-react';
import { or } from 'patronum';

import { attachToFeatureInput } from '@/shared/effector';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { collectiveDomain } from '@/domains/collectives';

import { fellowshipModel } from './fellowship';
import { votingHistoryFeatureStatus } from './status';

const gate = createGate<{ referendumId: ReferendumId }>();

const $votes = fellowshipModel.$store.map(store => store?.votes ?? {});
const $votesList = combine($votes, gate.state, (votes, { referendumId }) => {
  if (nullable(referendumId)) return [];

  return votes[referendumId] ?? [];
});

const referendumUpdate = attachToFeatureInput(votingHistoryFeatureStatus, gate.open);

sample({
  clock: referendumUpdate,
  filter: ({ data: { referendumId } }) => nonNullable(referendumId),
  fn: ({ data: { referendumId }, input }) => ({ ...input, referendumId }),
  target: collectiveDomain.votes.request,
});

export const votesModel = {
  $votesList,
  $pending: or(collectiveDomain.votes.pending, votingHistoryFeatureStatus.isStarting),
  $fulfilled: collectiveDomain.votes.fulfilled,

  gate,
};
