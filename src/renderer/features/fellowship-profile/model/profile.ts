import { attach, combine, sample } from 'effector';
import { and, or } from 'patronum';

import { attachToFeatureInput } from '@/shared/feature';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { member, memberService, referendumMeta, referendumMetaService, track, voting } from '@/domains/collectives';
import { identity } from '@/domains/network';

import { fellowshipProfileFeature } from './feature';
import { fellowship } from './fellowship';

const requestIdentityFx = attach({ effect: identity.request });

const $tracks = fellowship.$store.map(store => store?.tracks ?? []);
const $referendumMeta = fellowship.$store.map(store => store?.referendumMeta ?? {});
const $votes = fellowship.$store.map(store => store?.voting ?? []);
const $maxRank = fellowship.$store.map(store => store?.maxRank ?? 0);

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
  target: requestIdentityFx,
});

const $referendumsSinceLastProof = combine(
  {
    referendums: $referendumMeta,
    maxRank: $maxRank,
    member: $member,
  },
  ({ referendums, maxRank, member }) => {
    if (!member || !memberService.isCoreMember(member)) return [];
    return referendumMetaService.getReferendumsSinceLastProof(Object.values(referendums), member, maxRank);
  },
);

const $activityInfo = combine(
  { referendums: $referendumsSinceLastProof, votes: $memberVotes },
  ({ referendums, votes }) => referendumMetaService.getActivityInfo(referendums, votes),
);

const $pendingMember = and(or(member.pending, requestIdentityFx.pending), $member.map(nullable));
const $pendingReferendums = or($referendumMeta.map(nullable), referendumMeta.pending);
const $pendingVotes = or($memberVotes.map(nullable), voting.request.pending);

export const profile = {
  $member,
  $activityInfo,
  $pendingDetails: or($pendingReferendums, $pendingVotes),
  $account,
  $track,
  $identity,
  $isAccountExist,
  $pending: or($pendingMember, fellowshipProfileFeature.isStarting),
};
