import { combine, createEvent, sample } from 'effector';

import { attachToFeatureInput } from '@/shared/feature';
import { dictionary, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { evidence, referendumService, tracks, tracksService } from '@/domains/collectives';

import { fellowshipTasksFeature } from './feature';
import { fellowshipModel } from './fellowship';
import { member } from './member';

const requestEvidence = createEvent<AccountId>();

const $maxRank = fellowshipModel.$store.map(x => x?.maxRank ?? 0);
const $voting = fellowshipModel.$store.map(store => store?.voting ?? []);
const $tracks = fellowshipModel.$store.map(store => store?.tracks ?? []);
const $evidences = fellowshipModel.$store.map(store => store?.evidence ?? []);
const $referendums = fellowshipModel.$store.map(store => store?.referendums ?? []);
const $ongoing = $referendums.map(referendumService.getOngoingReferendums);

const $memberVoting = combine(member.$member, $voting, (member, voting) => {
  if (nullable(member)) return [];
  return voting.filter(v => v.accountId === member.accountId);
});

const $notVotedReferendumns = combine(
  { maxRank: $maxRank, member: member.$member, ongoing: $ongoing, voting: $memberVoting },
  ({ maxRank, member, ongoing, voting }) => {
    if (nullable(member)) return [];
    const votingMap = dictionary(voting, 'referendumId');
    return ongoing.filter(
      referendum =>
        !(referendum.id in votingMap) &&
        tracksService.rankSatisfiesVotingThreshold(member.rank, maxRank, referendum.track),
    );
  },
);

sample({
  clock: fellowshipTasksFeature.running,
  target: [tracks.request],
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
  target: evidence.request,
});

export const referendumList = {
  $referendums,
  $tracks,
  $evidences,
  $ongoing,
  $memberVoting,
  $notVotedReferendumns,

  requestEvidence,
};
