import { type BN } from '@polkadot/util';

import { type Address, type BlockHeight } from './general';
import { type ReferendumId } from './referendum';
import { type TrackId } from './track';

export type Conviction = 'None' | 'Locked1x' | 'Locked2x' | 'Locked3x' | 'Locked4x' | 'Locked5x' | 'Locked6x';

export type CastingVoting = {
  type: 'casting';
  casting: {
    votes: Record<ReferendumId, AccountVote>;
    prior: PriorLock;
  };
};

export type DelegatingVoting = {
  type: 'delegating';
  delegating: {
    balance: BN;
    target: Address;
    conviction: Conviction;
    prior: PriorLock;
  };
};

export type Voting = CastingVoting | DelegatingVoting;

export type PriorLock = {
  amount: BN;
  unlockAt: BlockHeight;
};

type BasicAccountVote = {
  track: string;
  referendumId: string;
};

export type StandardVote = BasicAccountVote & {
  type: 'standard';
  vote: {
    type: 'aye' | 'nay';
    conviction: Conviction;
  };
  balance: BN;
};

export type SplitVote = BasicAccountVote & {
  type: 'split';
  aye: BN;
  nay: BN;
};

export type SplitAbstainVote = BasicAccountVote & {
  type: 'splitAbstain';
  aye: BN;
  nay: BN;
  abstain: BN;
};

export type AccountVote = StandardVote | SplitVote | SplitAbstainVote;

export type VotingMap = Record<Address, Record<TrackId, Voting>>;
