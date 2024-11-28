import { type BN } from '@polkadot/util';

import { type ClaimAction } from '@/shared/api/governance';
import {
  type Account,
  type AccountVote,
  type Address,
  type Asset,
  type BlockHeight,
  type Chain,
  type ProxiedAccount,
  type Referendum,
  type ReferendumStatus,
  type Transaction,
  type VotingThreshold,
} from '@/shared/core';

export type AggregatedReferendum<T extends Referendum = Referendum> = T & {
  title: string | null;
  approvalThreshold: VotingThreshold | null;
  supportThreshold: VotingThreshold | null;
  votedByDelegate?: Address | null;
  voting: {
    of: number;
    votes: { voter: Address; vote: AccountVote }[];
  };
  end: BlockHeight | null;
  status: ReferendumStatus | null;
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

type ClaimData = {
  amount?: string;
  actions?: ClaimAction[];
  address?: Address;
};

export type AccountWithClaim = Account & ClaimData;

export type UnlockFormData = {
  id?: number;
  shards: AccountWithClaim[];
  amount: string;
  proxiedAccount?: ProxiedAccount & ClaimData;
  signatory: Account | null;
  chain: Chain;
  asset: Asset;
  totalLock: BN;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
  coreTx?: Transaction | null;
};
