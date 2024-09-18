import { type BN } from '@polkadot/util';

import { type ReferendumId, type TrackId } from '@/shared/pallet/referenda';
import { type AccountId, type BlockHeight } from '@shared/core';

export type Tally = {
  ayes: number;
  nays: number;
  bareAyes: number;
};

export type Deposit = {
  who: AccountId;
  amount: BN;
};

export type OngoingReferendum = {
  type: 'Ongoing';
  id: ReferendumId;
  track: TrackId;
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
  id: ReferendumId;
  since: BlockHeight;
  submissionDeposit: Deposit | null;
  decisionDeposit: Deposit | null;
};

export type ApprovedReferendum = {
  type: 'Approved';
  id: ReferendumId;
  since: BlockHeight;
  submissionDeposit: Deposit | null;
  decisionDeposit: Deposit | null;
};

export type CancelledReferendum = {
  type: 'Cancelled';
  id: ReferendumId;
  since: BlockHeight;
  submissionDeposit: Deposit | null;
  decisionDeposit: Deposit | null;
};

export type TimedOutReferendum = {
  type: 'TimedOut';
  id: ReferendumId;
  since: BlockHeight;
  submissionDeposit: Deposit | null;
  decisionDeposit: Deposit | null;
};

export type KilledReferendum = {
  type: 'Killed';
  id: ReferendumId;
  since: BlockHeight;
};

export type CompletedReferendum =
  | RejectedReferendum
  | ApprovedReferendum
  | CancelledReferendum
  | TimedOutReferendum
  | KilledReferendum;

export type Referendum = OngoingReferendum | CompletedReferendum;
