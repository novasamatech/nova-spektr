import { type BN } from '@polkadot/util';

import { type DelegateInfo } from '@/shared/api/governance';
import {
  type AccountVote,
  type BlockHeight,
  type Referendum,
  type ReferendumStatus,
  type VotingThreshold,
} from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export type AggregatedReferendum<T extends Referendum = Referendum> = T & {
  end: BlockHeight | null;
  status: ReferendumStatus | null;
  approvalThreshold: VotingThreshold | null;
  supportThreshold: VotingThreshold | null;
  votedByDelegates: DelegateInfo[];
  voting: {
    of: number;
    votes: {
      voter: AccountId;
      vote: AccountVote;
    }[];
  };
};

export type DecoupledVote = {
  decision: 'aye' | 'nay' | 'abstain';
  voter: AccountId;
  balance: BN;
  votingPower: BN;
  conviction: number;
};

export type DelegatedVote = {
  decision: 'aye' | 'nay' | 'abstain';
  delegator: AccountId;
  balance: BN;
  votingPower: BN;
  conviction: number;
};

export type AggregatedVoteHistory = {
  voter: AccountId;
  name: string | null;
  decision: 'aye' | 'nay' | 'abstain';
  totalVotingPower: BN;
  directVote?: DecoupledVote;
  delegatedVotes: DelegatedVote[];
};
