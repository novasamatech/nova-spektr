import { BN } from '@polkadot/util';

import type { Tally, VotingThreshold, VotingCurve, BlockHeight } from '@shared/core';

export type SupportParams = {
  supportCurve: VotingCurve;
  tally: Tally;
  totalIssuance: BN;
  blockDifference: BlockHeight;
  decisionPeriod: BN;
};

export type AyesParams = {
  approvalCurve: VotingCurve;
  tally: Tally;
  totalIssuance: BN;
  blockDifference: BlockHeight;
  decisionPeriod: BN;
};

export interface IVotingThreshold {
  supportThreshold(params: SupportParams): VotingThreshold;
  ayesFractionThreshold(params: AyesParams): VotingThreshold;
}
