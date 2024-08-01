import { type BN } from '@polkadot/util';

import { type ClaimAction } from '@/shared/api/governance';
import { type Account, type Address, type ProxiedAccount, type Referendum, type VotingThreshold } from '@shared/core';

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

export type AccountWithClaim = Account & {
  amount?: string;
  actions?: ClaimAction[];
  address?: Address;
};

export type UnlockFormData = {
  id?: number;
  shards: AccountWithClaim[];
  amount: string;
  description: string;
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
  transferableAmount: BN;
};
