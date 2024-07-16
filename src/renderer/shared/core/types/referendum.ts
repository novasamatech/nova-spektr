import { BN } from '@polkadot/util';

import type { BlockHeight, Address } from './general';
import type { TrackId } from './track';

export type ReferendumId = string;

export interface ReferendumInfo {
  type: ReferendumType;
  referendumId: ReferendumId;
}

export interface OngoingReferendum extends ReferendumInfo {
  type: ReferendumType.Ongoing;
  track: TrackId;
  proposal: string;
  submitted: BlockHeight;
  submissionDeposit: Deposit | null;
  decisionDeposit: Deposit | null;
  inQueue: boolean;
  enactment: {
    value: BN;
    type: 'At' | 'After';
  };
  deciding: {
    since: BlockHeight;
    confirming: BlockHeight;
  } | null;
  tally: Tally;
}

export interface RejectedReferendum extends ReferendumInfo {
  type: ReferendumType.Rejected;
  since: BlockHeight;
}

export interface ApprovedReferendum extends ReferendumInfo {
  type: ReferendumType.Approved;
  since: BlockHeight;
}

export interface CancelledReferendum extends ReferendumInfo {
  type: ReferendumType.Cancelled;
  since: BlockHeight;
}

export interface TimedOutReferendum extends ReferendumInfo {
  type: ReferendumType.TimedOut;
  since: BlockHeight;
}

export interface KilledReferendum extends ReferendumInfo {
  type: ReferendumType.Killed;
  since: BlockHeight;
}

export type CompletedReferendum =
  | RejectedReferendum
  | ApprovedReferendum
  | CancelledReferendum
  | TimedOutReferendum
  | KilledReferendum;

export type Referendum = OngoingReferendum | CompletedReferendum;

export const enum ReferendumType {
  Rejected = 'rejected',
  Approved = 'approved',
  Ongoing = 'ongoing',
  Cancelled = 'cancelled',
  TimedOut = 'timedOut',
  Killed = 'killed',
}

export type Tally = {
  ayes: BN;
  nays: BN;
  support: BN;
};

type Deposit = {
  who: Address;
  amount: BN;
};
