import { type BN } from '@polkadot/util';

import { type Address, type BlockHeight } from './general';
import { type TrackId } from './track';

export type ReferendumId = string;

export type OngoingReferendum = {
  type: ReferendumType.Ongoing;
  referendumId: ReferendumId;
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
};

export type RejectedReferendum = {
  type: ReferendumType.Rejected;
  referendumId: ReferendumId;
  since: BlockHeight;
};

export type ApprovedReferendum = {
  type: ReferendumType.Approved;
  referendumId: ReferendumId;
  since: BlockHeight;
};

export type CancelledReferendum = {
  type: ReferendumType.Cancelled;
  referendumId: ReferendumId;
  since: BlockHeight;
};

export type TimedOutReferendum = {
  type: ReferendumType.TimedOut;
  referendumId: ReferendumId;
  since: BlockHeight;
};

export type KilledReferendum = {
  type: ReferendumType.Killed;
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
