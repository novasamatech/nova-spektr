import { combine, sample } from 'effector';
import { createGate } from 'effector-react';
import { and, combineEvents, or } from 'patronum';

import { attachToFeatureInput } from '@/shared/feature';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { voting } from '@/domains/collectives';

import { fellowshipVotingHistoryFeature } from './feature';
import { fellowshipModel } from './fellowship';

const flow = createGate<{ referendumId: ReferendumId }>();

const $voting = fellowshipModel.$store.map(store => store?.voting ?? []);
const $members = fellowshipModel.$store.map(store => store?.members ?? []);

const $votesList = combine($voting, flow.state, (votes, { referendumId }) => {
  if (nullable(referendumId)) return [];

  return votes.filter(vote => vote.referendumId === referendumId) ?? [];
});

const requestVotes = combineEvents({
  events: {
    accounts: $members.updates.map(members => members.map(m => m.accountId)),
    referendumId: flow.open.map(s => s.referendumId).filter({ fn: nonNullable }),
  },
  reset: flow.close,
});

sample({
  clock: attachToFeatureInput(fellowshipVotingHistoryFeature, requestVotes),
  fn({ data: { accounts, referendumId }, input }) {
    return {
      palletType: input.palletType,
      chain: input.chain,
      api: input.api,
      accounts,
      referendums: [referendumId],
    };
  },
  target: voting.votesResource.start,
});

const $hasPendingRequest = and(
  $votesList.map(v => v.length === 0),
  voting.votesResource.$pending,
);

export const votesModel = {
  $votesList,
  $pending: or($hasPendingRequest, fellowshipVotingHistoryFeature.isStarting),

  flow,
};
