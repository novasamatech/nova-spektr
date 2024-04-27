import { BN } from '@polkadot/util';

import { BlockHeight, Address } from './general';

export const enum ReferendumType {
  Rejected = 'rejected',
  Approved = 'approved',
  Ongoing = 'ongoing',
}

export interface ReferendumInfo {
  index: string;
  type: ReferendumType;
  blockHeight: BlockHeight;
  submissionDeposit: Deposit | null;
  decisionDeposit: Deposit | null;
}

export interface RejectedReferendum extends ReferendumInfo {
  type: ReferendumType.Rejected;
}

export interface ApprovedReferendum extends ReferendumInfo {
  type: ReferendumType.Approved;
}

export interface OngoingReferendum extends ReferendumInfo {
  track: number;
  enactment: number;
  deciding: {
    since: BlockHeight;
    confirming: BlockHeight;
  } | null;
  tally: {
    ayes: BN;
    nays: BN;
    support: BN;
  };
  type: ReferendumType.Ongoing;
}

type Deposit = {
  who: Address;
  amount: BN;
};
