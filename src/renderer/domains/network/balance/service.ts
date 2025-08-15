import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';

import { type Asset, type AssetBalance, AssetType, type OrmlExtras } from '@/shared/core';
import { totalAmountBN, transferableAmountBN } from '@/shared/lib/utils';

import { type BalancePreservation, type BalanceUpdateResult } from './types';

function copyBalance(balance: AssetBalance, partial: Partial<AssetBalance>): AssetBalance {
  return {
    ...balance,
    ...partial,
  };
}

function tryFreeze(balance: AssetBalance, amount: BN): BalanceUpdateResult {
  const total = totalAmountBN(balance);
  const afterFreeze = total.sub(amount);

  const updated = copyBalance(balance, {
    frozen: BN.max(balance.frozen ?? BN_ZERO, amount),
  });

  if (afterFreeze.isNeg()) {
    return {
      success: false,
      balance: updated,
      imbalance: afterFreeze.abs(),
    };
  }

  return {
    success: true,
    balance: updated,
  };
}

function tryReserve(balance: AssetBalance, amount: BN, ed: BN): BalanceUpdateResult {
  const free = balance.free ?? BN_ZERO;
  const reserved = balance.reserved ?? BN_ZERO;

  // reducible_balance (https://github.com/paritytech/polkadot-sdk/blob/b9fbf243c57939ecadc89b82ed42249703203874/substrate/frame/balances/src/impl_fungible.rs#L47)
  // is called with Force and Protect args (https://github.com/paritytech/polkadot-sdk/blob/b9fbf243c57939ecadc89b82ed42249703203874/substrate/frame/support/src/traits/tokens/fungibles/hold.rs#L101)
  const reservable = free.sub(ed);
  const afterReservation = reservable.sub(amount);

  const updated = copyBalance(balance, {
    free: free.sub(amount),
    reserved: reserved.add(amount),
  });

  if (afterReservation.isNeg()) {
    return {
      success: false,
      balance: updated,
      imbalance: afterReservation.abs(),
    };
  }

  return {
    success: true,
    balance: updated,
  };
}

function tryWithdraw(
  balance: AssetBalance,
  amount: BN,
  ed: BN,
  balancePreservation: BalancePreservation,
): BalanceUpdateResult {
  const withdrawable = transferableAmountBN(balance, false);
  const wanted = balancePreservation === 'keepAlive' ? amount.add(ed) : BN.max(withdrawable, amount);
  const afterWithdraw = withdrawable.sub(wanted);

  const updated = copyBalance(balance, {
    free: balancePreservation === 'keepAlive' ? (balance.free ?? BN_ZERO).sub(amount) : BN_ZERO,
  });

  if (afterWithdraw.isNeg()) {
    return {
      success: false,
      balance: updated,
      imbalance: afterWithdraw.abs(),
    };
  }

  return {
    success: true,
    balance: updated,
  };
}

async function getExistentialDeposit(api: ApiPromise, asset: Asset): Promise<BN> {
  switch (asset.type) {
    case AssetType.NATIVE: {
      return api.consts.balances.existentialDeposit.toBn();
    }
    case AssetType.STATEMINE: {
      return await api.query.assets.asset(asset.assetId).then(balance => balance.value.minBalance.toBn());
    }
    case AssetType.ORML: {
      return new BN((asset.typeExtras as OrmlExtras).existentialDeposit);
    }
  }
}

export const balanceService = {
  tryFreeze,
  tryWithdraw,
  tryReserve,

  getExistentialDeposit,
};
