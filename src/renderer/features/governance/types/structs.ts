import { type ReferendumVote } from '@shared/api/governance';
import { type Referendum, type VotingThreshold } from '@shared/core';

export type AggregatedReferendum<T extends Referendum = Referendum> = T & {
  title: string | null;
  approvalThreshold: VotingThreshold | null;
  supportThreshold: VotingThreshold | null;
  isVoted: boolean;
};

export type AggregatedVoteHistory = ReferendumVote & {
  name: string | null;
};
