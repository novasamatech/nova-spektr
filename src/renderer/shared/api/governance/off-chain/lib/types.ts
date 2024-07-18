import { type BN } from '@polkadot/util';

import { type Address, type Chain, type ReferendumId } from '@shared/core';

export type ReferendumVote = {
  decision: 'aye' | 'nay' | 'abstain';
  voter: Address;
  balance: BN;
  conviction: number;
};

export type ReferendumTimelineRecordStatus =
  | 'All'
  | 'Confirmed'
  | 'Created'
  | 'ConfirmStarted'
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
  getReferendumList: (chain: Chain, callback: (data: Record<string, string>, done: boolean) => void) => void;
  getReferendumDetails: (chain: Chain, referendumId: ReferendumId) => Promise<string | undefined>;
  getReferendumVotes: (
    chain: Chain,
    referendumId: ReferendumId,
    callback: (data: ReferendumVote[], done: boolean) => void,
  ) => Promise<ReferendumVote[]>;
  getReferendumTimeline: (chain: Chain, referendumId: ReferendumId) => Promise<ReferendumTimelineRecord[]>;
}
