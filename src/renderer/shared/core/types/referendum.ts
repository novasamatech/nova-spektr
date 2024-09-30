import { type BN } from '@polkadot/util';

import { type Address, type BlockHeight } from './general';
import { type TrackId } from './track';

export type ReferendumId = string;

export type OngoingReferendum = {
  type: 'Ongoing';
  referendumId: ReferendumId;
  track: TrackId;
  proposal: string;
  submitted: BlockHeight;
  submissionDeposit: Deposit | null;
  decisionDeposit: Deposit | null;
  inQueue: boolean;
  enactment: {
    value: number;
    type: 'At' | 'After';
  };
  deciding: {
    since: BlockHeight;
    confirming: BlockHeight | null;
  } | null;
  tally: Tally;
};

export type RejectedReferendum = {
  type: 'Rejected';
  referendumId: ReferendumId;
  since: BlockHeight;
  submissionDeposit: Deposit | null;
  decisionDeposit: Deposit | null;
};

export type ApprovedReferendum = {
  type: 'Approved';
  referendumId: ReferendumId;
  since: BlockHeight;
  submissionDeposit: Deposit | null;
  decisionDeposit: Deposit | null;
};

export type CancelledReferendum = {
  type: 'Cancelled';
  referendumId: ReferendumId;
  since: BlockHeight;
  submissionDeposit: Deposit | null;
  decisionDeposit: Deposit | null;
};

export type TimedOutReferendum = {
  type: 'TimedOut';
  referendumId: ReferendumId;
  since: BlockHeight;
  submissionDeposit: Deposit | null;
  decisionDeposit: Deposit | null;
};

export type KilledReferendum = {
  type: 'Killed';
  referendumId: ReferendumId;
  since: BlockHeight;
};

export type CompletedReferendum =
  | RejectedReferendum
  | ApprovedReferendum
  | CancelledReferendum
  | TimedOutReferendum
  | KilledReferendum;

export type Referendum = OngoingReferendum | CompletedReferendum;
export type ReferendumType = 'Ongoing' | 'Approved' | 'Rejected' | 'Cancelled' | 'TimedOut' | 'Killed';
export type ReferendumStatus = 'NoDeposit' | 'Deciding' | 'Passing' | 'Execute';

export type Tally = {
  ayes: BN;
  nays: BN;
  support: BN;
};

export type Deposit = {
  who: Address;
  amount: BN;
};
