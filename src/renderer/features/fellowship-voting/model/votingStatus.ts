import { combine, restore, sample } from 'effector';

import { createFlow } from '@/shared/effector';
import { attachToFeatureInput } from '@/shared/feature';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { referendum, referendumService, trackService, voting } from '@/domains/collectives';
import { accountService } from '@/domains/network';

import { fellowshipVotingFeature } from './feature';
import { fellowship } from './fellowship';

const flow = createFlow<{ referendumId: ReferendumId | null }>({ referendumId: null });

const $referendumId = flow.state.map(({ referendumId }) => referendumId);
const $referendums = fellowship.$store.map(store => store?.referendums ?? []);
const $maxRank = fellowship.$store.map(x => x?.maxRank ?? 0);
const $voting = fellowship.$store.map(x => x?.voting ?? []);
const $currentMember = fellowshipVotingFeature.input.map(input => input?.member ?? null);
const $votingAccount = fellowshipVotingFeature.input.map(input => input?.account ?? null);

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

    return trackService.rankSatisfiesVotingThreshold(member.rank, maxRank, referendum.track);
  },
);

const $canVote = $votingAccount.map(a => nonNullable(a) && accountService.hasPermissionToMakeActions(a));

const $accountsVotes = restore(
  attachToFeatureInput(fellowshipVotingFeature, $voting).map(({ input: { account }, data: voting }) => {
    return voting.filter(voting => voting.accountId === account?.accountId);
  }),
  [],
);

const $referendumVoting = combine($accountsVotes, $referendumId, (voting, referendumId) => {
  return voting.find(vote => vote.referendumId === referendumId) ?? null;
});

sample({
  clock: attachToFeatureInput(fellowshipVotingFeature, $referendumId),
  fn({ data: referendumId, input: { api, chainId, palletType } }) {
    return {
      api,
      chainId,
      palletType,
      referendums: [referendumId].filter(nonNullable),
    };
  },
  target: referendum.request,
});

sample({
  clock: fellowshipVotingFeature.running,
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
  clock: fellowshipVotingFeature.stopped,
  target: voting.unsubscribeAccountsVoting,
});

export const votingStatus = {
  $referendumVoting,
  $accountsVotes,
  $hasRequiredRank,
  $votingAccount,
  $currentMember,
  $maxRank,
  $canVote,
  $referendum,
  flow,
};
