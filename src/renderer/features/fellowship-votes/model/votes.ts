import { combine, sample } from 'effector';
import { createGate } from 'effector-react';
import { or } from 'patronum';

import { attachToFeatureInput } from '@/shared/effector';
import { nonNullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { collectiveDomain } from '@/domains/collectives';

import { fellowshipModel } from './fellowship';
import { votesFeatureStatus } from './status';

const gate = createGate<{ referendumId: ReferendumId | null }>({ defaultState: { referendumId: null } });

const $votes = fellowshipModel.$store.map(store => store?.votes ?? []);

const $votesList = combine($votes, gate.state, (votes, { referendumId }) => {
  if (!votes || referendumId === null) return [];

  return votes[referendumId] ?? [];
});

const votesUpdate = attachToFeatureInput(votesFeatureStatus, gate.state);

sample({
  clock: votesUpdate,
  filter: ({ data: { referendumId } }) => nonNullable(referendumId),
  fn: ({ data: { referendumId }, input }) => ({ ...input, referendumId: referendumId! }),
  target: collectiveDomain.votes.request,
});

export const votesModel = {
  $votesList,
  $pending: or(collectiveDomain.votes.pending, votesFeatureStatus.isStarting),
  $fulfilled: collectiveDomain.votes.fulfilled,

  gate,
};
