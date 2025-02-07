import { combine, sample } from 'effector';
import { and, or } from 'patronum';

import { attachToFeatureInput } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { member } from '@/domains/collectives';
import { identity, identityDomain } from '@/domains/identity';

import { fellowshipTasksFeature } from './feature';

const $member = fellowshipTasksFeature.input.map(store => (store ? store.member : null));

const $identities = combine(fellowshipTasksFeature.input, identityDomain.identity.$list, (featureInput, list) => {
  if (nullable(featureInput)) return {};

  return list[featureInput.chainId] ?? {};
});

const $identity = combine($member, $identities, (member, identities) => {
  if (nullable(member)) return null;

  return identities[member.accountId] ?? null;
});

const $pendingMember = and(or(member.pending, identity.pending), $member.map(nullable));

const memberUpdate = attachToFeatureInput(fellowshipTasksFeature, $member);

sample({
  clock: fellowshipTasksFeature.running,
  target: member.subscribe,
});

sample({
  clock: fellowshipTasksFeature.stopped,
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
  $identity,
  $pending: or($pendingMember, fellowshipTasksFeature.isStarting),
};
