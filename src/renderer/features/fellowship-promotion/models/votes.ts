import { combine, sample } from 'effector';
import { and, combineEvents, or } from 'patronum';

import { attachToFeatureInput } from '@/shared/feature';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { voting } from '@/domains/collectives';

import { fellowshipPromotionFeature } from './feature';
import { fellowship } from './fellowship';
import { fellowshipPromotion } from './promotion';

const $voting = fellowship.$store.map(store => store?.voting ?? []);
const $members = fellowship.$store.map(store => store?.members ?? []);

const $votesList = combine(
  { votes: $voting, referendum: fellowshipPromotion.$promotionReferendum },
  ({ votes, referendum }) => {
    if (nullable(referendum) || nullable(votes)) return [];

    return votes.filter(vote => vote.referendumId === referendum.id) ?? [];
  },
);

const requestVotes = combineEvents({
  events: {
    accounts: $members.updates.map(members => members.map(m => m.accountId)),
    referendumId: fellowshipPromotion.$promotionReferendum.updates.map(r => r?.id).filter({ fn: nonNullable }),
  },
});

sample({
  clock: attachToFeatureInput(fellowshipPromotionFeature, requestVotes),
  fn({ data: { accounts, referendumId }, input }) {
    return {
      palletType: input.palletType,
      chain: input.chain,
      api: input.api,
      accounts,
      referendums: [referendumId],
    };
  },
  target: voting.request,
});

const $hasPendingRequest = and(
  $votesList.map(v => v.length === 0),
  voting.request.pending,
);

export const votesModel = {
  $votesList,
  $pending: or($hasPendingRequest, fellowshipPromotionFeature.isStarting),
};
