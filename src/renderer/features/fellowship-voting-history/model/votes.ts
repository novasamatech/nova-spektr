import { combine, sample } from 'effector';
import { createGate } from 'effector-react';
import { or } from 'patronum';

import { nonNullable, nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { collectiveDomain } from '@/domains/collectives';

import { fellowshipModel } from './fellowship';
import { votingHistoryFeatureStatus } from './status';

const gate = createGate<{ referendumId: ReferendumId | null }>({ defaultState: { referendumId: null } });

const $votesMap = fellowshipModel.$store.map(store => store?.votes ?? []);
const $votesList = combine($votesMap, gate.state, (votes, { referendumId }) => {
  if (nullable(referendumId)) return [];

  return votes[referendumId] ?? [];
});

sample({
  clock: gate.state,
  source: votingHistoryFeatureStatus.input,
  filter: (input, { referendumId }) => nonNullable(input) && nonNullable(referendumId),
  fn: (input, { referendumId }) => ({
    palletType: input!.palletType,
    api: input!.api,
    chainId: input!.chainId,
    referendumId: referendumId!,
  }),
  target: collectiveDomain.votes.request,
});

export const votesModel = {
  $votesList,
  $pending: or(collectiveDomain.votes.pending, votingHistoryFeatureStatus.isStarting),
  $fulfilled: collectiveDomain.votes.fulfilled,

  gate,
};
