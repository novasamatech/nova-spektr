import { Referendum, VotingThreshold } from '@shared/core';
import { ReferendumVote } from '@shared/api/governance';

export type AggregatedReferendum<T extends Referendum = Referendum> = T & {
  title: string | null;
  approvalThreshold: VotingThreshold | null;
  supportThreshold: VotingThreshold | null;
  isVoted: boolean;
};

export type AggregatedVoteHistory = ReferendumVote & {
  name: string | null;
};
