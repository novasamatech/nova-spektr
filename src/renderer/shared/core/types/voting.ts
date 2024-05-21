import { BN } from '@polkadot/util';

import type { BlockHeight, Address } from './general';
import type { ReferendumId } from './referendum';

export interface Voting {
  type: VotingType;
}

export interface CastingVoting extends Voting {
  type: VotingType.CASTING;
  casting: {
    votes: Record<ReferendumId, AccountVote>;
    prior: PriorLock;
  };
}

export interface DelegatingVoting extends Voting {
  type: VotingType.DELEGATING;
  delegating: {
    amount: BN;
    target: Address;
    conviction: Conviction;
    prior: PriorLock;
  };
}

export const enum VotingType {
  CASTING = 'casting',
  DELEGATING = 'delegating',
}

export type PriorLock = {
  amount: BN;
  unlockAt: BlockHeight;
};

export interface AccountVote {
  track: string;
  referendumIndex: string;
  type: VoteType;
}

export interface StandardVote extends AccountVote {
  type: VoteType.Standard;
  vote: {
    type: 'aye' | 'nay';
    conviction: Conviction;
  };
  balance: BN;
}

export interface SplitVote extends AccountVote {
  type: VoteType.Split;
  aye: BN;
  nay: BN;
}

export interface SplitAbstainVote extends AccountVote {
  type: VoteType.SplitAbstain;
  aye: BN;
  nay: BN;
  abstain: BN;
}

export const enum VoteType {
  Standard = 'standard',
  Split = 'split',
  SplitAbstain = 'split_abstain',
}

export const enum Conviction {
  None = 'None',
  Locked1x = 'locked_1x',
  Locked2x = 'locked_2x',
  Locked3x = 'locked_3x',
  Locked4x = 'locked_4x',
  Locked5x = 'locked_5x',
  Locked6x = 'locked_6x',
}
