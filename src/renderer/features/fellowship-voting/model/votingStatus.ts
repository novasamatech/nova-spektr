import { combine, restore, sample } from 'effector';
import { createGate } from 'effector-react';

import { attachToFeatureInput } from '@/shared/feature';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { referendumService, referendums, tracksService, voting } from '@/domains/collectives';
import { accountsService } from '@/domains/network';

import { votingFeatureStatus } from './feature';
import { fellowshipModel } from './fellowship';

const flow = createGate<{ referendumId: ReferendumId | null }>({
  defaultState: { referendumId: null },
});

const $referendumId = flow.state.map(({ referendumId }) => referendumId);
const $referendums = fellowshipModel.$store.map(store => store?.referendums ?? []);
const $maxRank = fellowshipModel.$store.map(x => x?.maxRank ?? 0);
const $voting = fellowshipModel.$store.map(x => x?.voting ?? []);
const $currentMember = votingFeatureStatus.input.map(input => input?.member ?? null);
const $votingAccount = votingFeatureStatus.input.map(input => input?.account ?? null);

const $referendum = combine($referendums, $referendumId, (referendums, referendumId) => {
  return referendums.find(referendum => referendum.id === referendumId) ?? null;
});

const $hasRequiredRank = combine(
  {
    member: $currentMember,
    referendum: $referendum,
    maxRank: $maxRank,
  },
  ({ member, referendum, maxRank }) => {
    if (nullable(member) || nullable(referendum) || referendumService.isCompleted(referendum)) {
      return false;
    }

    return tracksService.rankSatisfiesVotingThreshold(member.rank, maxRank, referendum.track);
  },
);

const $canVote = $votingAccount.map(a => nonNullable(a) && accountsService.hasPermissionToMakeActions(a));

const $accountsVotes = restore(
  attachToFeatureInput(votingFeatureStatus, $voting).map(({ input: { account }, data: voting }) => {
    return voting.filter(voting => voting.accountId === account?.accountId);
  }),
  [],
);

const $referendumVoting = combine($accountsVotes, $referendumId, (voting, referendumId) => {
  return voting.find(vote => vote.referendumId === referendumId) ?? null;
});

sample({
  clock: attachToFeatureInput(votingFeatureStatus, flow.open),
  fn({ data: { referendumId }, input: { api, chainId, palletType } }) {
    return {
      api,
      chainId,
      palletType,
      referendums: [referendumId].filter(nonNullable),
    };
  },
  target: referendums.request,
});

sample({
  clock: votingFeatureStatus.running,
  fn: ({ palletType, api, chain, account }) => {
    return {
      palletType,
      api,
      chainId: chain.chainId,
      accounts: account ? [account.accountId] : [],
    };
  },

  target: voting.subscribeAccountsVoting,
});

sample({
  clock: votingFeatureStatus.stopped,
  target: voting.unsubscribeAccountsVoting,
});

export const votingStatusModel = {
  $referendumVoting,
  $hasRequiredRank,
  $votingAccount,
  $currentMember,
  $maxRank,
  $canVote,
  $referendum,
  flow,
};
