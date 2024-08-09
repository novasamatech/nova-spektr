import { type AggregatedVoteHistory } from '../types/structs';

export const votingPowerSorting = (a: AggregatedVoteHistory, b: AggregatedVoteHistory) =>
  b.votingPower.eq(a.votingPower) ? 0 : b.votingPower.gt(a.votingPower) ? 1 : -1;
