import { BN, BN_ZERO } from '@polkadot/util';

import { type Balance } from '@/shared/core';
import { totalAmountBN, transferableAmountBN } from '@/shared/lib/utils';

import { type BalancePreservation, type BalanceUpdateResult } from './types';

function copyBalance(balance: Balance, partial: Partial<Balance>): Balance {
  return {
    ...balance,
    ...partial,
  };
}

function tryFreeze(balance: Balance, amount: BN): BalanceUpdateResult {
  const total = totalAmountBN(balance);
  const afterFreeze = total.sub(amount);

  const updated = copyBalance(balance, {
    frozen: BN.max(balance.frozen, amount),
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

function tryReserve(balance: Balance, amount: BN): BalanceUpdateResult {
  // reducible_balance (https://github.com/paritytech/polkadot-sdk/blob/b9fbf243c57939ecadc89b82ed42249703203874/substrate/frame/balances/src/impl_fungible.rs#L47)
  // is called with Force and Protect args (https://github.com/paritytech/polkadot-sdk/blob/b9fbf243c57939ecadc89b82ed42249703203874/substrate/frame/support/src/traits/tokens/fungibles/hold.rs#L101)
  const reservable = balance.free.sub(balance.ed);
  const afterReservation = reservable.sub(amount);

  const updated = copyBalance(balance, {
    free: balance.free.sub(amount),
    reserved: balance.reserved.add(amount),
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

function tryWithdraw(balance: Balance, amount: BN, balancePreservation: BalancePreservation): BalanceUpdateResult {
  const withdrawable = transferableAmountBN(balance, false);
  const wanted = balancePreservation === 'keepAlive' ? amount.add(balance.ed) : BN.max(withdrawable, amount);
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

export const balanceService = {
  tryFreeze,
  tryWithdraw,
  tryReserve,
};
