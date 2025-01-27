import { combine, sample } from 'effector';
import { and, or } from 'patronum';

import { attachToFeatureInput } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { members, membersService } from '@/domains/collectives';
import { identity, identityDomain } from '@/domains/identity';

import { fellowshipProfileFeature } from './feature';
import { fellowshipModel } from './fellowship';

const $members = fellowshipModel.$store.map(store => store?.members ?? []);

const $identities = combine(fellowshipProfileFeature.input, identityDomain.identity.$list, (featureInput, list) => {
  if (nullable(featureInput)) return {};

  return list[featureInput.chainId] ?? {};
});

const $accounts = fellowshipProfileFeature.input.map(store => (store ? store.accounts : []));

const $currentMember = combine($accounts, $members, (accounts, members) => {
  return membersService.findMatchingMember(accounts, members);
});

const $identity = combine($currentMember, $identities, (member, identities) => {
  if (nullable(member)) return null;

  return identities[member.accountId] ?? null;
});

const $isAccountExist = fellowshipProfileFeature.input.map(store => {
  if (!store) return false;

  return store.accounts.length > 0;
});

const $pendingMember = and(
  or(members.pending, identity.pending),
  $members.map(m => m.length === 0),
);

const memberUpdate = attachToFeatureInput(fellowshipProfileFeature, $currentMember);

sample({
  clock: fellowshipProfileFeature.running,
  target: members.subscribe,
});

sample({
  clock: fellowshipProfileFeature.stopped,
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

export const profile = {
  $currentMember,
  $identity,
  $isAccountExist,
  $pending: or($pendingMember, fellowshipProfileFeature.isStarting),
};
