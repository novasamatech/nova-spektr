import { BN } from '@polkadot/util';

import { Address, Chain, ReferendumId } from '@shared/core';

export type ReferendumVote = {
  decision: 'aye' | 'nay' | 'abstain';
  voter: Address;
  balance: BN;
  conviction: number;
};

export type ReferendumTimelineRecordStatus =
  | 'All'
  | 'Confirmed'
  | 'ConfirmStarted'
  | 'Cancelled'
  | 'Deciding'
  | 'DecisionDepositPlaced'
  | 'Killed'
  | 'Submitted'
  | 'Rejected'
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
