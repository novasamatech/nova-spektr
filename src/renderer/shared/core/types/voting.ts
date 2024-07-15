import { BN } from '@polkadot/util';

import type { BlockHeight, Address } from './general';
import type { ReferendumId } from './referendum';
import { TrackId } from './track';

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
    balance: BN;
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

export type VotingMap = Record<Address, Record<TrackId, Voting>>;

export const enum Conviction {
  None = 'None',
  Locked1x = 'Locked1x',
  Locked2x = 'Locked2x',
  Locked3x = 'Locked3x',
  Locked4x = 'Locked4x',
  Locked5x = 'Locked5x',
  Locked6x = 'Locked6x',
}
