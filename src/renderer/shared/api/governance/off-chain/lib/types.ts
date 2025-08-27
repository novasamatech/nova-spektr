import { type BN } from '@polkadot/util';

import { type Address, type Chain, type Conviction, type ReferendumId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

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
  getReferendumVotes: (chain: Chain, referendumId: ReferendumId) => Promise<AccountId[]>;
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
  accountId: AccountId;
  name: string;
  image: string;
  shortDescription: string;
  longDescription: string;
  isOrganization: boolean;
};

export type DelegateStat = {
  accountId: AccountId;
  delegators: number;
  delegatorVotes: string;
  delegateVotes: number;
  delegateVotesMonth: number;
};

export type Delegation = {
  delegator: AccountId;
  delegation: {
    amount: string;
    conviction: Conviction;
  };
  trackId: number;
};

export type DelegationsByAccount = {
  accountId: AccountId;
  delegations: Delegation[];
};

export type DelegateAccount = DelegateStat & Partial<DelegateDetails>;

export type DelegateInfo = {
  delegator: AccountId;
  delegateAccount: AccountId;
  decision: 'aye' | 'nay';
  amount: BN;
  conviction: Conviction;
};

export interface DelegationApi {
  getDelegatesFromRegistry: (chain: Chain) => Promise<DelegateDetails[]>;
  getDelegatedVotesFromExternalSource: (
    chain: Chain,
    accounts: AccountId[],
  ) => Promise<Record<ReferendumId, DelegateInfo[]>>;
  getDelegatesFromExternalSource: (chain: Chain, timestamp: number) => Promise<DelegateStat[]>;
  getDelegatesForAccount: (chain: Chain, accountId: AccountId) => Promise<DelegationsByAccount | null>;
  aggregateDelegateAccounts: (accounts: DelegateDetails[], stats: DelegateStat[], chain: Chain) => DelegateAccount[];

  calculateTotalVotes: (votingPower: BN, tracks: number[], chain: Chain) => BN;
}
