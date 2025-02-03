import { combine, sample } from 'effector';
import { and, or } from 'patronum';

import { attachToFeatureInput } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { members, membersService } from '@/domains/collectives';
import { identity, identityDomain } from '@/domains/identity';

import { fellowshipTasksFeature } from './feature';
import { fellowshipModel } from './fellowship';

const $members = fellowshipModel.$store.map(store => store?.members ?? []);
const $accounts = fellowshipTasksFeature.input.map(store => (store ? store.accounts : []));

const $identities = combine(fellowshipTasksFeature.input, identityDomain.identity.$list, (featureInput, list) => {
  if (nullable(featureInput)) return {};

  return list[featureInput.chainId] ?? {};
});

const $member = combine($accounts, $members, (accounts, members) => {
  return membersService.findMatchingMember(accounts, members);
});

const $identity = combine($member, $identities, (member, identities) => {
  if (nullable(member)) return null;

  return identities[member.accountId] ?? null;
});

const $pendingMember = and(
  or(members.pending, identity.pending),
  $members.map(m => m.length === 0),
);

const memberUpdate = attachToFeatureInput(fellowshipTasksFeature, $member);

sample({
  clock: fellowshipTasksFeature.running,
  target: members.subscribe,
});

sample({
  clock: fellowshipTasksFeature.stopped,
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

export const member = {
  $member,
  $identity,
  $pending: or($pendingMember, fellowshipTasksFeature.isStarting),
};
