import {
  type ReferendumId,
  type Serializable,
  type SplitAbstainVote,
  type StandardVote,
  type TrackId,
  type Transaction,
} from '@/shared/core';

export type TransactionStandardVote = { Standard: Serializable<StandardVote> };
export type TransactionSplitAbstainVote = { SplitAbstain: Serializable<SplitAbstainVote> };
export type TransactionVote = TransactionStandardVote | TransactionSplitAbstainVote;

export type VoteTransaction = Transaction<{
  track: TrackId;
  referendum: ReferendumId;
  vote: TransactionVote;
}>;

export type RevoteTransaction = Transaction<{
  track: TrackId;
  referendum: ReferendumId;
  vote: TransactionVote;
}>;

export type RemoveVoteTransaction = Transaction<{
  trackId: TrackId;
  referendumId: ReferendumId;
}>;
