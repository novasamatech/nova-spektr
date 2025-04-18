import { combine, sample } from 'effector';
import { and, or } from 'patronum';

import { attachToFeatureInput } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { member, track } from '@/domains/collectives';
import { identity } from '@/domains/network';

import { fellowshipSalaryFeature } from './feature';

const $member = fellowshipSalaryFeature.input.map(store => (store ? store.member : null));
const $account = fellowshipSalaryFeature.input.map(store => (store ? store.account : null));

const $identities = combine(fellowshipSalaryFeature.input, identity.$list, (featureInput, list) => {
  if (nullable(featureInput)) return {};

  return list[featureInput.chainId] ?? {};
});

const $identity = combine($member, $identities, (member, identities) => {
  if (nullable(member)) return null;

  return identities[member.accountId] ?? null;
});

const $pendingMember = and(or(member.pending, identity.request.pending), $member.map(nullable));

const memberUpdate = attachToFeatureInput(fellowshipSalaryFeature, $member);

sample({
  clock: fellowshipSalaryFeature.running,
  target: [member.subscribe, track.request],
});

sample({
  clock: fellowshipSalaryFeature.stopped,
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

export const profile = {
  $member,
  $account,
  $identity,
  $pending: or($pendingMember, fellowshipSalaryFeature.isStarting),
};
