import { combine, restore, sample } from 'effector';
import { createGate } from 'effector-react';

import { attachToFeatureInput } from '@/shared/effector';
import { nonNullable, nullable, toKeysRecord } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { collectiveDomain } from '@/domains/collectives';

import { fellowshipModel } from './fellowship';
import { votingFeatureStatus } from './status';

const gate = createGate<{ referendumId: ReferendumId | null }>({
  defaultState: { referendumId: null },
});

const $referendumId = gate.state.map(({ referendumId }) => referendumId);
const $referendums = fellowshipModel.$store.map(store => store?.referendums ?? []);
const $members = fellowshipModel.$store.map(x => x?.members ?? []);
const $maxRank = fellowshipModel.$store.map(x => x?.maxRank ?? 0);
const $voting = fellowshipModel.$store.map(x => x?.voting ?? []);

const $referendum = combine($referendums, $referendumId, (referendums, referendumId) => {
  return referendums.find(referendum => referendum.id === referendumId) ?? null;
});

const $currectMember = combine(votingFeatureStatus.input, $members, (featureInput, members) => {
  if (nullable(featureInput)) return null;

  // TODO restore
  // return collectiveDomain.members.service.findMachingMember(featureInput.wallet, members, featureInput.chain);
  return members[0] ?? null;
});

const $votingAccount = combine(votingFeatureStatus.input, $currectMember, (input, member) => {
  if (nullable(member) || nullable(input)) return null;

  // TODO restore
  // return collectiveDomain.members.service.findMachingAccount(input.wallet, member);
  return input.wallet.accounts[0] ?? null;
});

const $hasRequiredRank = combine($currectMember, $referendum, $maxRank, (member, referendum, maxRank) => {
  if (nullable(member) || nullable(referendum) || collectiveDomain.referendumService.isCompleted(referendum)) {
    return false;
  }

  return collectiveDomain.tracksService.rankSatisfiesVotingThreshold(member.rank, maxRank, referendum.track);
});

const $canVote = $currectMember.map(nonNullable);

const $walletVoting = restore(
  attachToFeatureInput(votingFeatureStatus, $voting).map(({ input: { wallet }, data: voting }) => {
    const accounts = toKeysRecord(wallet.accounts.map(a => a.accountId));

    return voting.filter(voting => voting.accountId in accounts);
  }),
  [],
);

const $referendumVoting = combine($walletVoting, $referendumId, (voting, referendumId) => {
  return voting.find(vote => vote.referendumId === referendumId) ?? null;
});

sample({
  clock: attachToFeatureInput(votingFeatureStatus, $referendums),

  fn: ({ input: { palletType, api, chainId, wallet }, data: referendums }) => {
    return {
      palletType,
      api,
      chainId,
      referendums: referendums.map(r => r.id),
      accounts: wallet.accounts.map(a => pjsSchema.helpers.toAccountId(a.accountId)),
    };
  },

  target: collectiveDomain.voting.subscribe,
});

export const votingStatusModel = {
  $referendumVoting,
  $hasRequiredRank,
  $votingAccount,
  $currectMember,
  $canVote,
  $referendum,
  gate,
};
