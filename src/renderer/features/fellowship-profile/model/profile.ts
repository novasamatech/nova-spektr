import { combine, sample } from 'effector';
import { and, or } from 'patronum';

import { attachToFeatureInput } from '@/shared/feature';
import { dictionary, nonNullable, nullable } from '@/shared/lib/utils';
import {
  member,
  memberService,
  referendumMeta,
  referendumMetaService,
  track,
  trackService,
  voting,
} from '@/domains/collectives';
import { identity } from '@/domains/network';

import { fellowshipProfileFeature } from './feature';
import { fellowshipModel } from './fellowship';

const $tracks = fellowshipModel.$store.map(store => store?.tracks ?? []);
const $referendums = fellowshipModel.$store.map(store => store?.referendumMeta ?? []);
const $votes = fellowshipModel.$store.map(store => store?.voting ?? []);
const $maxRank = fellowshipModel.$store.map(x => x?.maxRank ?? 0);

const $member = fellowshipProfileFeature.input.map(store => (store ? store.member : null));
const $account = fellowshipProfileFeature.input.map(store => (store ? store.account : null));
const $isAccountExist = fellowshipProfileFeature.input.map(store => nonNullable(store?.account));

const $memberVotes = combine($member, $votes, (member, voting) => {
  if (nullable(member)) return [];
  return voting.filter(v => v.accountId === member.accountId);
});

const $identities = combine(fellowshipProfileFeature.input, identity.$list, (featureInput, list) => {
  if (nullable(featureInput)) return {};

  return list[featureInput.chainId] ?? {};
});

const $identity = combine($member, $identities, (member, identities) => {
  if (nullable(member)) return null;

  return identities[member.accountId] ?? null;
});

const $track = combine($member, $tracks, (member, tracks) => {
  if (nullable(member)) return null;

  return tracks.find(t => t.id === member.rank) ?? null;
});

const $pendingMember = and(member.pending, identity.pending, $member.map(nullable));

const memberUpdate = attachToFeatureInput(fellowshipProfileFeature, $member);

sample({
  clock: fellowshipProfileFeature.running,
  target: [member.subscribe, track.request],
});

sample({
  clock: fellowshipProfileFeature.stopped,
  target: member.unsubscribe,
});

sample({
  clock: memberUpdate,
  fn: ({ input: { chainId }, data: member }) => ({
    chainId,
    accounts: member ? [member.accountId] : [],
  }),
  target: identity.request,
});

const $availableReferendumsForMember = combine(
  {
    referendums: $referendums,
    maxRank: $maxRank,
    member: $member,
  },
  ({ referendums, maxRank, member }) => {
    if (!member || !memberService.isCoreMember(member)) return [];

    return Object.values(referendums).filter(ref => {
      return (
        ref.created >= member.lastProof && trackService.rankSatisfiesVotingThreshold(member.rank, maxRank, ref.track)
      );
    });
  },
);

const $profileDetails = combine(
  { referendums: $availableReferendumsForMember, memberVotes: $memberVotes },
  ({ referendums, memberVotes }) => {
    if (referendums.length === 0) return { activity: null, agreement: null };

    let voted = 0;
    let agreementVote = 0;

    const memberVotesMap = dictionary(memberVotes, 'referendumId');

    for (const referendum of referendums) {
      const memberVote = memberVotesMap[referendum.referendumId];

      if (!memberVote) continue;
      if (referendumMetaService.matchReferendumStatus(referendum) === memberVote.decision) agreementVote++;
      voted++;
    }

    const activity = Math.round((voted / referendums.length) * 100);
    const agreement = Math.round((agreementVote / voted) * 100);

    return { activity, agreement };
  },
);

const $pendingReferendums = or($referendums.map(nullable), referendumMeta.pending);
const $pendingVotes = or($memberVotes.map(nullable), voting.pending);

export const profile = {
  $member,
  $profileDetails,
  $pendingDetails: or($pendingReferendums, $pendingVotes),
  $account,
  $track,
  $identity,
  $isAccountExist,
  $pending: or($pendingMember, fellowshipProfileFeature.isStarting),
};
