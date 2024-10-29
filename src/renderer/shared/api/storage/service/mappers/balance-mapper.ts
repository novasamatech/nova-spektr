import { BN } from '@polkadot/util';

import { type Balance } from '@/shared/core';
import { ZERO_BALANCE } from '@/shared/lib/utils';
import { type BnToString } from '../../lib/types';

export const balanceMapper = {
  fromDB,
  toDB,
};

function fromDB(balance: BnToString<Balance>): Balance {
  return {
    ...balance,
    free: balance.free ? new BN(balance.free) : undefined,
    frozen: balance.frozen ? new BN(balance.frozen) : undefined,
    reserved: balance.reserved ? new BN(balance.reserved) : undefined,

    locked: balance.locked
      ? balance.locked.map((locked) => ({
          type: locked.type,
          amount: new BN(locked.amount || ZERO_BALANCE),
        }))
      : undefined,
  };
}

function toDB(balance: Balance): BnToString<Balance> {
  return {
    ...balance,
    free: balance.free?.toString(),
    frozen: balance.frozen?.toString(),
    reserved: balance.reserved?.toString(),

    locked: balance.locked
      ? balance.locked.map((locked) => ({
          type: locked.type,
          amount: locked.amount.toString(),
        }))
      : undefined,
  };
}
