import { type BN } from '@polkadot/util';

import { type BlockHeight } from './general';

export type TrackId = string;

export type TrackInfo = {
  name: string;
  maxDeciding: BlockHeight;
  decisionDeposit: BN;
  preparePeriod: BlockHeight;
  decisionPeriod: BlockHeight;
  minApproval: VotingCurve;
  minSupport: VotingCurve;
};

export interface LinearDecreasingCurve {
  type: 'LinearDecreasing';
  length: BN;
  floor: BN;
  ceil: BN;
}

export interface SteppedDecreasingCurve {
  type: 'SteppedDecreasing';
  begin: BN;
  end: BN;
  step: BN;
  period: BN;
}

export interface ReciprocalCurve {
  type: 'Reciprocal';
  factor: BN;
  xOffset: BN;
  yOffset: BN;
}

export type VotingCurve = LinearDecreasingCurve | SteppedDecreasingCurve | ReciprocalCurve;

export type VotingThreshold = {
  value: BN;
  passing: boolean;
  curve: LinearDecreasingCurve | SteppedDecreasingCurve | ReciprocalCurve | null;
};
