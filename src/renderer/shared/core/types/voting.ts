import { BN } from '@polkadot/util';

export interface AccountVote {
  index: string;
  type: VotingType;
}

export interface StandardVote extends AccountVote {
  type: VotingType.Standard;
  vote: {
    type: 'aye' | 'nay';
    conviction: Conviction;
  };
  balance: BN;
}

export interface SplitVote extends AccountVote {
  type: VotingType.Split;
  aye: BN;
  nay: BN;
}

export interface SplitAbstainVote extends AccountVote {
  type: VotingType.SplitAbstain;
  aye: BN;
  nay: BN;
  abstain: BN;
}

export const enum VotingType {
  Standard = 'standard',
  Split = 'split',
  SplitAbstain = 'split_abstain',
}

export type TrackLock = {
  track: number;
  lock: BN;
};

export const enum Conviction {
  None = 'None',
  Locked1x = 'locked_1x',
  Locked2x = 'locked_2x',
  Locked3x = 'locked_3x',
  Locked4x = 'locked_4x',
  Locked5x = 'locked_5x',
  Locked6x = 'locked_6x',
}
