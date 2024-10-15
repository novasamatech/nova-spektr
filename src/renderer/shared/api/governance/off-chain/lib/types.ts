import { type BN } from '@polkadot/util';

import { type Address, type Chain, type Conviction, type ReferendumId } from '@/shared/core';

export type ReferendumTimelineRecordStatus =
  | 'All'
  | 'Approved'
  | 'Confirmed'
  | 'Created'
  | 'ConfirmStarted'
  | 'ConfirmAborted'
  | 'Cancelled'
  | 'Deciding'
  | 'DecisionDepositPlaced'
  | 'Killed'
  | 'Executed'
  | 'Submitted'
  | 'Rejected'
  | 'Awarded'
  | 'TimedOut';

export type ReferendumTimelineRecord = {
  date: Date;
  status: ReferendumTimelineRecordStatus;
};

export type ReferendumSummary = {
  ayes: BN;
  nays: BN;
  support: BN;
};

export interface GovernanceApi {
  getReferendumList: (
    chain: Chain,
    callback: (data: IteratorResult<Record<ReferendumId, string>, void>) => void,
  ) => void;
  getReferendumDetails: (chain: Chain, referendumId: ReferendumId) => Promise<string | undefined>;
  getReferendumVotes: (chain: Chain, referendumId: ReferendumId) => Promise<Address[]>;
  getReferendumTimeline: (chain: Chain, referendumId: ReferendumId) => Promise<ReferendumTimelineRecord[]>;
  getReferendumSummary: (chain: Chain, referendumId: ReferendumId) => Promise<ReferendumSummary>;
}

export type SubQueryVoting = {
  delegatorVotes: {
    nodes: {
      delegator: Address;
      vote: {
        amount: string;
        conviction: Conviction;
      };
    }[];
  };
  referendumId: ReferendumId;
  splitAbstainVote: {
    abstainAmount: string;
    ayeAmount: string;
    nayAmount: string;
  } | null;
  splitVote: {
    ayeAmount: string;
    nayAmount: string;
  } | null;
  standardVote: {
    aye: boolean;
    vote: {
      amount: string;
      conviction: Conviction;
    };
  } | null;
  voter: Address;
  at: number;
};

export type DelegateDetails = {
  address: Address;
  name: string;
  image: string;
  shortDescription: string;
  longDescription: string;
  isOrganization: boolean;
};

export type DelegateStat = {
  // Address actually
  accountId: Address;
  delegators: number;
  delegatorVotes: string;
  delegateVotes: number;
  delegateVotesMonth: number;
};

export type Delegation = {
  delegator: Address;
  delegation: {
    amount: string;
    conviction: Conviction;
  };
  trackId: number;
};

export type DelegationsByAccount = {
  accountId: Address;
  delegations: Delegation[];
};

export type DelegateAccount = DelegateStat & Partial<DelegateDetails>;

export interface DelegationApi {
  getDelegatesFromRegistry: (chain: Chain) => Promise<DelegateDetails[]>;
  getDelegatedVotesFromExternalSource: (chain: Chain, voter: Address[]) => Promise<Record<ReferendumId, Address>>;
  getDelegatesFromExternalSource: (chain: Chain, blockNumber: number) => Promise<DelegateStat[]>;
  getDelegatesForAccount: (chain: Chain, accountId: string) => Promise<DelegationsByAccount | null>;
  aggregateDelegateAccounts: (accounts: DelegateDetails[], stats: DelegateStat[]) => DelegateAccount[];

  calculateTotalVotes: (votingPower: BN, tracks: number[], chain: Chain) => BN;
}
