import { BN } from '@polkadot/util';

import { type Balance, type Serializable } from '@/shared/core';
import { ZERO_BALANCE } from '@/shared/lib/utils';

export const balanceMapper = {
  fromDB,
  toDB,
};

function fromDB(balance: Serializable<Balance>): Balance {
  return {
    id: balance.id,
    chainId: balance.chainId,
    assetId: balance.assetId,
    assetType: balance.assetType,
    accountId: balance.accountId,
    transferableMode: balance.transferableMode,
    free: new BN(balance.free),
    frozen: new BN(balance.frozen),
    reserved: new BN(balance.reserved),
    providers: balance.providers,
    consumers: balance.consumers,
    sufficients: balance.sufficients,
    ed: new BN(balance.ed),

    locked: balance.locked.map((locked) => ({
      type: locked.type,
      amount: new BN(locked.amount || ZERO_BALANCE),
    })),
  };
}

function toDB(balance: Balance): Serializable<Balance> {
  return {
    id: balance.id,
    accountId: balance.accountId,
    chainId: balance.chainId,
    assetId: balance.assetId,
    assetType: balance.assetType,
    transferableMode: balance.transferableMode,
    free: balance.free.toString(),
    frozen: balance.frozen.toString(),
    reserved: balance.reserved.toString(),
    providers: balance.providers,
    consumers: balance.consumers,
    sufficients: balance.sufficients,
    ed: balance.ed.toString(),

    locked: balance.locked.map((locked) => ({
      type: locked.type,
      amount: locked.amount.toString(),
    })),
  };
}
