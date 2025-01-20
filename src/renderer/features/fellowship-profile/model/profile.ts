import { combine, sample } from 'effector';
import { and, or } from 'patronum';

import { attachToFeatureInput } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { members, membersService } from '@/domains/collectives';
import { identity, identityDomain } from '@/domains/identity';

import { fellowshipModel } from './fellowship';
import { profileFeatureStatus } from './status';

const $members = fellowshipModel.$store.map(store => store?.members ?? []);

const $identities = combine(profileFeatureStatus.input, identityDomain.identity.$list, (featureInput, list) => {
  if (nullable(featureInput)) return {};

  return list[featureInput.chainId] ?? {};
});

const $accounts = profileFeatureStatus.input.map(store => (store ? store.accounts : []));

const $currentMember = combine($accounts, $members, (accounts, members) => {
  return membersService.findMatchingMember(accounts, members);
});

const $identity = combine($currentMember, $identities, (member, identities) => {
  if (nullable(member)) return null;

  return identities[member.accountId] ?? null;
});

const $isAccountExist = profileFeatureStatus.input.map(store => {
  if (!store) return false;

  return store.accounts.length > 0;
});

const $pendingMember = and(members.pending, $currentMember.map(nullable));
const $pendingIdentity = and(identity.pending, $identity.map(nullable));

const memberUpdate = attachToFeatureInput(profileFeatureStatus, $currentMember);

sample({
  clock: profileFeatureStatus.running,
  target: members.subscribe,
});

sample({
  clock: profileFeatureStatus.stopped,
  target: members.unsubscribe,
});

sample({
  clock: memberUpdate,
  fn: ({ input: { chainId }, data: member }) => ({
    chainId,
    accounts: member ? [member.accountId] : [],
  }),
  target: identityDomain.identity.request,
});

export const profileModel = {
  $currentMember,
  $identity,
  $isAccountExist,
  $pending: or($pendingMember, $pendingIdentity, profileFeatureStatus.isStarting),
};
