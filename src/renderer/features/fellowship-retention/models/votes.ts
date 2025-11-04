import { combine } from 'effector';

import { nullable } from '@/shared/lib/utils';

import { fellowshipRetentionFeature } from './feature';
import { fellowship } from './fellowship';
import { fellowshipRetention } from './retention';

const $voting = fellowship.$store.map(store => store?.voting ?? []);

const $votesList = combine(
  { votes: $voting, referendum: fellowshipRetention.$retentionReferendum },
  ({ votes, referendum }) => {
    if (nullable(referendum) || nullable(votes)) return [];

    return votes.filter(vote => vote.referendumId === referendum.id) ?? [];
  },
);

export const votesModel = {
  $votesList,
  $pending: fellowshipRetentionFeature.isStarting,
};
