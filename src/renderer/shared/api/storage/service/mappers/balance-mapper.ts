import { BN } from '@polkadot/util';

import { type Balance, type Serializable } from '@/shared/core';
import { ZERO_BALANCE } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';

export const balanceMapper = {
  fromDB,
  toDB,
};

function fromDB(balance: Serializable<Balance>): Balance {
  return {
    ...balance,
    accountId: pjsSchema.helpers.toAccountId(balance.accountId),
    free: new BN(balance.free),
    frozen: new BN(balance.frozen),
    reserved: new BN(balance.reserved),
    ed: new BN(balance.ed),

    locked: balance.locked.map((locked) => ({
      type: locked.type,
      amount: new BN(locked.amount || ZERO_BALANCE),
    })),
  };
}

function toDB(balance: Balance): Serializable<Balance> {
  return {
    ...balance,
    free: balance.free.toString(),
    frozen: balance.frozen.toString(),
    reserved: balance.reserved.toString(),
    ed: balance.ed.toString(),

    locked: balance.locked.map((locked) => ({
      type: locked.type,
      amount: locked.amount.toString(),
    })),
  };
}
