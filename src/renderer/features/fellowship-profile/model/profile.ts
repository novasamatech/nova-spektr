import { combine, sample } from 'effector';
import { and, or } from 'patronum';

import { attachToFeatureInput } from '@/shared/feature';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { member, track } from '@/domains/collectives';
import { identity, identityDomain } from '@/domains/identity';

import { fellowshipProfileFeature } from './feature';
import { fellowshipModel } from './fellowship';

const $tracks = fellowshipModel.$store.map(store => store?.tracks ?? []);
const $member = fellowshipProfileFeature.input.map(store => (store ? store.member : null));
const $account = fellowshipProfileFeature.input.map(store => (store ? store.account : null));
const $isAccountExist = fellowshipProfileFeature.input.map(store => nonNullable(store?.account));

const $identities = combine(fellowshipProfileFeature.input, identityDomain.identity.$list, (featureInput, list) => {
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

const $pendingMember = and(or(member.pending, identity.pending), $member.map(nullable));

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
  target: identityDomain.identity.request,
});

export const profile = {
  $member,
  $account,
  $track,
  $identity,
  $isAccountExist,
  $pending: or($pendingMember, fellowshipProfileFeature.isStarting),
};
