import { combine, sample } from 'effector';
import { and, or } from 'patronum';

import { attachToFeatureInput } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { members, membersService, tracks } from '@/domains/collectives';
import { identity, identityDomain } from '@/domains/identity';

import { fellowshipSalaryFeature } from './feature';
import { fellowshipModel } from './fellowship';

const $members = fellowshipModel.$store.map(store => store?.members ?? []);
const $accounts = fellowshipSalaryFeature.input.map(store => (store ? store.accounts : []));

const $identities = combine(fellowshipSalaryFeature.input, identityDomain.identity.$list, (featureInput, list) => {
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

const memberUpdate = attachToFeatureInput(fellowshipSalaryFeature, $member);

sample({
  clock: fellowshipSalaryFeature.running,
  target: [members.subscribe, tracks.request],
});

sample({
  clock: fellowshipSalaryFeature.stopped,
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
  $pending: or($pendingMember, fellowshipSalaryFeature.isStarting),
};
