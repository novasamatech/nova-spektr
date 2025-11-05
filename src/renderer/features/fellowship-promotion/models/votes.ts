import { combine } from 'effector';

import { nullable } from '@/shared/lib/utils';

import { fellowshipPromotionFeature } from './feature';
import { fellowship } from './fellowship';
import { fellowshipPromotion } from './promotion';

const $voting = fellowship.$store.map(store => store?.voting ?? []);

const $votesList = combine(
  { votes: $voting, referendum: fellowshipPromotion.$promotionReferendum },
  ({ votes, referendum }) => {
    if (nullable(referendum) || nullable(votes)) return [];

    return votes.filter(vote => vote.referendumId === referendum.id) ?? [];
  },
);

export const votesModel = {
  $votesList,
  $pending: fellowshipPromotionFeature.isStarting,
};
