import { type BN } from '@polkadot/util';

import { type ChainId } from '@/shared/core';
import { type TrackId } from '@/shared/pallet/referenda';
import { type BlockHeight } from '@/shared/polkadotjs-schemas';
import { type CollectivePalletsType } from '../_lib/types';

export type Track = {
  id: TrackId;
  chainId: ChainId;
  pallet: CollectivePalletsType;
  name: string;
  maxDeciding: BlockHeight;
  decisionDeposit: BN;
  preparePeriod: BlockHeight;
  decisionPeriod: BlockHeight;
  minEnactmentPeriod: BlockHeight;
  minApproval: VotingCurve;
  minSupport: VotingCurve;
};

export type LinearDecreasingCurve = {
  type: 'LinearDecreasing';
  length: BN;
  floor: BN;
  ceil: BN;
};

export type SteppedDecreasingCurve = {
  type: 'SteppedDecreasing';
  begin: BN;
  end: BN;
  step: BN;
  period: BN;
};

export type ReciprocalCurve = {
  type: 'Reciprocal';
  factor: BN;
  xOffset: BN;
  yOffset: BN;
};

export type VotingCurve = LinearDecreasingCurve | SteppedDecreasingCurve | ReciprocalCurve;

export type VotingThreshold = {
  value: BN;
  threshold: BN;
  passing: boolean;
  curve: LinearDecreasingCurve | SteppedDecreasingCurve | ReciprocalCurve | null;
};
