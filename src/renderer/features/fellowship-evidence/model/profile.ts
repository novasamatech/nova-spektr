import { combine, sample } from 'effector';
import { and, or } from 'patronum';

import { attachToFeatureInput } from '@/shared/feature';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { track } from '@/domains/collectives';
import { accountService, identity } from '@/domains/network';

import { fellowshipEvidenceFeature } from './feature';

const $member = fellowshipEvidenceFeature.input.map(store => (store ? store.member : null));
const $account = fellowshipEvidenceFeature.input.map(store => (store ? store.account : null));

const $identities = combine(fellowshipEvidenceFeature.input, identity.$list, (featureInput, list) => {
  if (nullable(featureInput)) return {};

  return list[featureInput.chainId] ?? {};
});

const $identity = combine($member, $identities, (member, identities) => {
  if (nullable(member)) return null;

  return identities[member.accountId] ?? null;
});

const $canVote = $account.map(a => nonNullable(a) && accountService.hasPermissionToMakeActions(a));

const $pendingMember = and(identity.request.pending, $member.map(nullable));

const memberUpdate = attachToFeatureInput(fellowshipEvidenceFeature, $member);

sample({
  clock: fellowshipEvidenceFeature.running,
  target: [track.request],
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
  $canVote,
  $pending: or($pendingMember, fellowshipEvidenceFeature.isStarting),
};
