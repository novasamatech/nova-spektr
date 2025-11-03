import { type ApiPromise } from '@polkadot/api';
import { attach, combine, createStore, sample } from 'effector';

import { type ChainId } from '@/shared/core';
import { attachToFeatureInput } from '@/shared/feature';
import { nonNullable, nullable, shallowEqual } from '@/shared/lib/utils';
import { type PalletType } from '@/shared/pallet/collective/types';
import { memberService, referendumMetaService, track } from '@/domains/collectives';
import { identity } from '@/domains/network';

import { fellowshipProfileFeature } from './feature';
import { fellowship } from './fellowship';

const requestIdentityFx = attach({ effect: identity.request });

const $tracks = fellowship.$store.map(store => store?.tracks ?? null);
const $referendumMeta = fellowship.$store.map(store => store?.referendumMeta ?? null);
const $votes = fellowship.$store.map(store => store?.voting ?? []);
const $maxRank = fellowship.$store.map(store => store?.maxRank ?? 0);

const $member = fellowshipProfileFeature.input.map(store => (store ? store.member : null));
const $account = fellowshipProfileFeature.input.map(store => (store ? store.account : null));
const $isAccountExist = fellowshipProfileFeature.input.map(store => nonNullable(store?.account));

const $memberVotes = combine($member, $votes, (member, voting) => {
  if (nullable(member) || nullable(voting)) return null;
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
  if (nullable(member) || nullable(tracks)) return null;

  return tracks.find(t => t.id === member.rank) ?? null;
});

const $fellowshipParams = createStore<{
  api: ApiPromise;
  chainId: ChainId;
  palletType: PalletType;
} | null>(null);

const fellowshipProviderUpdated = fellowshipProfileFeature.running.map(({ api, chainId, palletType }) => {
  return { api, chainId, palletType };
});

sample({
  clock: fellowshipProviderUpdated,
  source: $fellowshipParams,
  filter: (prev, next) => !shallowEqual(prev, next),
  fn: (_, next) => next,
  target: [$fellowshipParams, track.request],
});

sample({
  clock: attachToFeatureInput(fellowshipProfileFeature, $member),
  fn: ({ input: { chainId }, data: member }) => ({
    chainId,
    accounts: member ? [member.accountId] : [],
  }),
  target: requestIdentityFx,
});

const $referendumsSinceLastProof = combine(
  {
    referendums: $referendumMeta,
    member: $member,
  },
  ({ referendums, member }) => {
    if (!member || !memberService.isCoreMember(member)) return null;
    return referendums && referendumMetaService.getReferendumsSinceLastProof(Object.values(referendums), member);
  },
);

const $activityInfo = combine(
  {
    referendums: $referendumsSinceLastProof,
    member: $member,
    maxRank: $maxRank,
    votes: $memberVotes,
  },
  ({ referendums, member, maxRank, votes }) => {
    if (nullable(referendums) || nullable(member) || nullable(votes)) {
      return null;
    }

    return referendumMetaService.getActivityInfo(referendums, member, maxRank, votes);
  },
);

export const profile = {
  $member,
  $activityInfo,
  $account,
  $track,
  $identity,
  $isAccountExist,
  $pending: fellowshipProfileFeature.isStarting,
};
