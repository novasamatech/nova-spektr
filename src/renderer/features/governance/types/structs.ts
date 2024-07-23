import { type BN } from '@polkadot/util';

import { type Address, type Referendum, type VotingThreshold } from '@shared/core';

export type AggregatedReferendum<T extends Referendum = Referendum> = T & {
  title: string | null;
  approvalThreshold: VotingThreshold | null;
  supportThreshold: VotingThreshold | null;
  isVoted: boolean;
};

export type DecoupledVote = {
  decision: 'aye' | 'nay' | 'abstain';
  voter: Address;
  balance: BN;
  votingPower: BN;
  conviction: number;
};

export type AggregatedVoteHistory = DecoupledVote & {
  name: string | null;
};
