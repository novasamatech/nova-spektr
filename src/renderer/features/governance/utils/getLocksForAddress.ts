import { BN, BN_ZERO } from '@polkadot/util';

import { type Address, type TrackId } from '@shared/core';

export const getLocksForAddress = (address: string, trackLocks: Record<Address, Record<TrackId, BN>>): BN => {
  return Object.values(trackLocks[address]).reduce((max, x) => BN.max(max, x), BN_ZERO);
};
