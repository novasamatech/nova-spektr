import { combine, sample } from 'effector';
import { and, or } from 'patronum';

import { attachToFeatureInput } from '@/shared/effector';
import { nullable } from '@/shared/lib/utils';
import { collectiveDomain } from '@/domains/collectives';
import { identityDomain } from '@/domains/identity';
import { accountUtils } from '@/entities/wallet';

import { fellowshipModel } from './fellowship';
import { profileFeatureStatus } from './status';

const $members = fellowshipModel.$store.map(store => store?.members ?? []);

const $identities = combine(profileFeatureStatus.input, identityDomain.identity.$list, (featureInput, list) => {
  if (nullable(featureInput)) return {};

  return list[featureInput.chainId] ?? {};
});

const $currentMember = combine(profileFeatureStatus.input, $members, (featureInput, members) => {
  if (nullable(featureInput) || members.length === 0) return null;

  const { wallet, accounts, chain } = featureInput;

  return collectiveDomain.membersService.findMatchingMember(wallet, accounts, chain, members);
});

const $identity = combine($currentMember, $identities, (member, identities) => {
  if (nullable(member)) return null;

  return identities[member.accountId] ?? null;
});

const $isAccountExist = profileFeatureStatus.input.map(store => {
  if (!store) return false;

  return store.accounts.some(account => {
    return !accountUtils.isBaseAccount(account) && accountUtils.isChainAndCryptoMatch(account, store.chain);
  });
});

const $pendingMember = and(collectiveDomain.members.pending, $currentMember.map(nullable));
const $pendingIdentity = and(identityDomain.identity.pending, $identity.map(nullable));

const memberUpdate = attachToFeatureInput(profileFeatureStatus, $currentMember);

sample({
  clock: profileFeatureStatus.running,
  target: collectiveDomain.members.subscribe,
});

sample({
  clock: profileFeatureStatus.stopped,
  target: collectiveDomain.members.unsubscribe,
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
