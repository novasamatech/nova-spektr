import { BN } from '@polkadot/util';

import type { BlockHeight } from './general';

export type TrackId = string;

export type TrackInfo = {
  name: string;
  maxDeciding: BN;
  decisionDeposit: BN;
  preparePeriod: BlockHeight;
  decisionPeriod: BlockHeight;
};
