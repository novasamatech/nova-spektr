import { combine, sample } from 'effector';
import { and, or } from 'patronum';

import { attachToFeatureInput } from '@/shared/feature';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { member } from '@/domains/collectives';
import { accountService, identity } from '@/domains/network';

import { fellowshipTasksFeature } from './feature';
import { identityModel } from './identity';
const $member = fellowshipTasksFeature.input.map(store => (store ? store.member : null));
const $account = fellowshipTasksFeature.input.map(store => (store ? store.account : null));

const $hasPermission = $account.map(account => {
  return nonNullable(account) && accountService.hasPermissionToMakeActions(account);
});

const $hasAccount = $account.map(nonNullable);

const $identity = combine($member, identityModel.$identities, (member, identities) => {
  if (nullable(member)) return null;

  return identities[member.accountId] ?? null;
});

const $pendingMember = and(or(member.pending, identity.request.pending), $member.map(nullable));

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
  target: identity.request,
});

export const memberProfile = {
  $member,
  $account,
  $hasPermission,
  $hasAccount,
  $identity,
  $pending: or($pendingMember, fellowshipTasksFeature.isStarting),
};
