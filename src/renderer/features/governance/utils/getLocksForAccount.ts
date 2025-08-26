import { BN, BN_ZERO } from '@polkadot/util';

import { type TrackLocks } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const getLocksForAccount = (accountId: AccountId, trackLocks: TrackLocks): BN => {
  const locks = trackLocks[accountId];

  if (nullable(locks)) {
    return BN_ZERO;
  }

  return Object.values(locks).reduce((max, x) => BN.max(max, x), BN_ZERO);
};
