import { type BN, BN_ZERO } from '@polkadot/util';

import { toAddress } from '@/shared/lib/utils';
import { type Address, type TrackId } from '@shared/core';

export const getLocksForAccount = (
  accountId: string,
  trackLocks: Record<Address, Record<TrackId, BN>>,
  addresPrefix: number,
): BN => {
  const address = toAddress(accountId, { prefix: addresPrefix });

  return Object.values(trackLocks[address]).reduce((max, x) => (max.gte(x) ? max : x), BN_ZERO);
};
