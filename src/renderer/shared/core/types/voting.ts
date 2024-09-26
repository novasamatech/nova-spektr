import { type BN } from '@polkadot/util';

import { type Address, type BlockHeight } from './general';
import { type ReferendumId } from './referendum';
import { type TrackId } from './track';

export type Conviction = 'None' | 'Locked1x' | 'Locked2x' | 'Locked3x' | 'Locked4x' | 'Locked5x' | 'Locked6x';

export type CastingVoting = {
  type: 'Casting';
  track: string;
  address: Address;
  votes: Record<ReferendumId, AccountVote>;
  prior: PriorLock;
};

export type DelegatingVoting = {
  type: 'Delegating';
  track: string;
  address: Address;
  balance: BN;
  target: Address;
  conviction: Conviction;
  prior: PriorLock;
};

export type Voting = CastingVoting | DelegatingVoting;

export type PriorLock = {
  amount: BN;
  unlockAt: BlockHeight;
};

export type StandardVote = {
  type: 'Standard';
  vote: {
    aye: boolean;
    conviction: Conviction;
    // TODO: Add new type for decoded mst tx
    vote?: 'Aye' | 'Nay';
  };
  balance: BN;
};

export type SplitVote = {
  type: 'Split';
  aye: BN;
  nay: BN;
};

export type SplitAbstainVote = {
  type: 'SplitAbstain';
  aye: BN;
  nay: BN;
  abstain: BN;
};

export type AccountVote = StandardVote | SplitVote | SplitAbstainVote;

export type VotingMap = Record<Address, Record<TrackId, Voting>>;

export type DelegationBalanceMap = Record<Address, Record<Address, { conviction: Conviction; balance: BN }>>;
export type DelegationTracksMap = Record<Address, Record<Address, string[]>>;
