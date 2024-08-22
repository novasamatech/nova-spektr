import { type Address, type Chain, type Conviction, type ReferendumId } from '@shared/core';

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

export interface GovernanceApi {
  getReferendumList: (chain: Chain, callback: (data: Record<ReferendumId, string>, done: boolean) => void) => void;
  getReferendumDetails: (chain: Chain, referendumId: ReferendumId) => Promise<string | undefined>;
  getReferendumVotes: (
    chain: Chain,
    referendumId: ReferendumId,
    callback: (data: Address[], done: boolean) => void,
  ) => Promise<Address[]>;
  getReferendumTimeline: (chain: Chain, referendumId: ReferendumId) => Promise<ReferendumTimelineRecord[]>;
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
};

export type DelegateAccount = DelegateStat & Partial<DelegateDetails>;

export interface DelegationApi {
  getDelegatesFromRegistry: (chain: Chain) => Promise<DelegateDetails[]>;
  getDelegatedVotesFromExternalSource: (chain: Chain, voter: Address[]) => Promise<Record<ReferendumId, Address>>;
  getDelegatesFromExternalSource: (chain: Chain, blockNumber: number) => Promise<DelegateStat[]>;
  aggregateDelegateAccounts: (accounts: DelegateDetails[], stats: DelegateStat[]) => DelegateAccount[];
}
