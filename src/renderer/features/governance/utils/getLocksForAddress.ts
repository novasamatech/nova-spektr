import { BN, BN_ZERO } from '@polkadot/util';

import { type TrackLocks } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';

export const getLocksForAddress = (address: string, trackLocks: TrackLocks): BN => {
  const locks = trackLocks[address];

  if (nullable(locks)) {
    return BN_ZERO;
  }

  return Object.values(locks).reduce((max, x) => BN.max(max, x), BN_ZERO);
};
