import { combine } from 'effector';

import { createFlow } from '@/shared/effector';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { walletModel } from '@/entities/wallet';

import { fellowshipVotingFeature } from './feature';
import { fellowship } from './fellowship';

const flow = createFlow<{ referendumId: ReferendumId | null }>({ referendumId: null });

const $referendumId = flow.state.map(({ referendumId }) => referendumId);
const $referendums = fellowship.$store.map(store => store?.referendums ?? []);

const $voting = fellowship.$store.map(store => store?.voting ?? []);

const $currentMember = fellowshipVotingFeature.input.map(input => input?.member ?? null);
const $votingAccount = fellowshipVotingFeature.input.map(input => input?.account ?? null);

// voting

const $accountsVotes = combine({ voting: $voting, account: $votingAccount }, ({ voting, account }) => {
  return voting.filter(voting => voting.accountId === account?.accountId);
});

// referendum

const $referendum = combine($referendums, $referendumId, (referendums, referendumId) => {
  return referendums.find(referendum => referendum.id === referendumId) ?? null;
});

const $referendumVoting = combine($accountsVotes, $referendumId, (voting, referendumId) => {
  return voting.find(vote => vote.referendumId === referendumId) ?? null;
});

export const votingStatus = {
  $referendumVoting,
  $accountsVotes,
  $votingAccount,
  $currentMember,
  $wallets: walletModel.$wallets,

  $referendum,
  flow,
};
