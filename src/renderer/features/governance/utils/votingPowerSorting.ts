import { type AggregatedVoteHistory, type DelegatedVote } from '../types/structs';

export const votingPowerSorting = (a: DelegatedVote, b: DelegatedVote) =>
  b.votingPower.eq(a.votingPower) ? 0 : b.votingPower.gt(a.votingPower) ? 1 : -1;

export const totalVotingPowerSorting = (a: AggregatedVoteHistory, b: AggregatedVoteHistory) =>
  b.totalVotingPower.eq(a.totalVotingPower) ? 0 : b.totalVotingPower.gt(a.totalVotingPower) ? 1 : -1;
