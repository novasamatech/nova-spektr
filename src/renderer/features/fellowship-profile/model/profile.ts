import { combine, sample } from 'effector';
import { or } from 'patronum';

import { attachToFeatureInput } from '@/shared/effector';
import { nullable } from '@/shared/lib/utils';
import { collectiveDomain } from '@/domains/collectives';
import { identityDomain } from '@/domains/identity';

import { fellowshipModel } from './fellowship';
import { profileFeatureStatus } from './status';

const $members = fellowshipModel.$store.map(x => x?.members ?? []);
const $identities = combine(profileFeatureStatus.input, identityDomain.identity.$list, (featureInput, list) => {
  if (nullable(featureInput)) return {};

  return list[featureInput.chainId] ?? {};
});

const $currentMember = combine(profileFeatureStatus.input, $members, (featureInput, members) => {
  if (nullable(featureInput) || members.length === 0) return null;

  return collectiveDomain.membersService.findMachingMember(featureInput.accounts, members, featureInput.chain);
});

const $identity = combine($currentMember, $identities, (member, identities) => {
  if (nullable(member)) return null;

  return identities[member.accountId] ?? null;
});

const accountUpdate = attachToFeatureInput(profileFeatureStatus, $currentMember);

sample({
  clock: profileFeatureStatus.running,
  target: collectiveDomain.members.subscribe,
});

sample({
  clock: profileFeatureStatus.stopped,
  target: collectiveDomain.members.unsubscribe,
});

sample({
  clock: accountUpdate,
  fn: ({ input: { chainId }, data: member }) => ({
    chainId,
    accounts: member ? [member.accountId] : [],
  }),
  target: identityDomain.identity.request,
});

export const profileModel = {
  $currentMember,
  $identity,
  $pending: or(collectiveDomain.members.pending, identityDomain.identity.pending, profileFeatureStatus.isStarting),
  $fulfilled: collectiveDomain.members.fulfilled,
};
