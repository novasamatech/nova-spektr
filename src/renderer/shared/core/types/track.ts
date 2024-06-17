import { BN } from '@polkadot/util';

import type { BlockHeight } from './general';

export type TrackId = string;

export type TrackInfo = {
  name: string;
  maxDeciding: BN;
  decisionDeposit: BN;
  preparePeriod: BlockHeight;
  decisionPeriod: BlockHeight;
  minApproval: VotingCurve;
  minSupport: VotingCurve;
};

export interface VotingCurve {
  type: 'LinearDecreasing' | 'SteppedDecreasing' | 'Reciprocal';
}

export interface LinearDecreasingCurve extends VotingCurve {
  type: 'LinearDecreasing';
  length: BN;
  floor: BN;
  ceil: BN;
}

export interface SteppedDecreasingCurve extends VotingCurve {
  type: 'SteppedDecreasing';
  begin: BN;
  end: BN;
  step: BN;
  period: BN;
}

export interface ReciprocalCurve extends VotingCurve {
  type: 'Reciprocal';
  factor: BN;
  xOffset: BN;
  yOffset: BN;
}

export type VotingThreshold = {
  value: BN;
  passing: boolean;
};
