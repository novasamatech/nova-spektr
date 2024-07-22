import { votingAggregate } from './voting';

export const walletVotesAggregate = {
  $votes: votingAggregate.$activeWalletVotes,
};
