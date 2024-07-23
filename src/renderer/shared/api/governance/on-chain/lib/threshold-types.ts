import { type BN } from '@polkadot/util';

import { type BlockHeight, type Tally, type VotingCurve } from '@shared/core';

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
