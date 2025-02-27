import { attach, combine, createEvent, sample } from 'effector';

import { populated } from '@/shared/effector';
import { attachToFeatureInput } from '@/shared/feature';
import { dictionary, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { evidence, referendumService, track, trackService, voting } from '@/domains/collectives';

import { fellowshipTasksFeature } from './feature';
import { fellowship } from './fellowship';
import { profile } from './profile';

const requestEvidence = createEvent<AccountId>();
const requestEvidenceFx = attach({ effect: evidence.request });
const requestVotesFx = attach({ effect: voting.request });

const $votes = fellowship.$store.map(store => store?.voting ?? []);
const $tracks = fellowship.$store.map(store => store?.tracks ?? []);
const $maxRank = fellowship.$store.map(x => x?.maxRank ?? 0);
const $referendums = fellowship.$store.map(store => store?.referendums ?? []);
const $ongoing = $referendums.map(referendumService.getOngoingReferendums);
const $votesPopulated = populated(requestVotesFx);

const $memberVotes = combine(profile.$member, $votes, (member, voting) => {
  if (nullable(member)) return [];
  return voting.filter(v => v.accountId === member.accountId);
});

const $notVotedReferendumns = combine(
  {
    maxRank: $maxRank,
    member: profile.$member,
    ongoing: $ongoing,
    votes: $memberVotes,
    votesPopulated: $votesPopulated,
  },
  ({ maxRank, member, ongoing, votes, votesPopulated }) => {
    if (nullable(member) || !votesPopulated) return [];
    const votesMap = dictionary(votes, 'referendumId');
    return ongoing.filter(
      referendum =>
        !(referendum.id in votesMap) &&
        trackService.rankSatisfiesVotingThreshold(member.rank, maxRank, referendum.track),
    );
  },
);

sample({
  clock: fellowshipTasksFeature.running,
  target: [track.request],
});

sample({
  clock: attachToFeatureInput(fellowshipTasksFeature, $ongoing),
  filter({ data: referendums }) {
    return referendums.length > 0;
  },
  fn({ input, data }) {
    return {
      palletType: input.palletType,
      chainId: input.chainId,
      referendums: data.map(r => r.id),
    };
  },
  target: requestVotesFx,
});

sample({
  clock: attachToFeatureInput(fellowshipTasksFeature, requestEvidence),
  fn({ input, data: accountId }) {
    return {
      palletType: input.palletType,
      api: input.api,
      chain: input.chain,
      accountId,
    };
  },
  target: requestEvidenceFx,
});

export const referendums = {
  $tracks,
  $memberVoting: $memberVotes,
  $notVotedReferendumns,
  $evidencePending: requestEvidenceFx.pending,

  requestEvidence,
};
