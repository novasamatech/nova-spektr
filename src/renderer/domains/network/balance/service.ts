import { BN, BN_ZERO } from '@polkadot/util';

import { type Balance, type TransferableMode } from '@/shared/core';
import { reservableAmountBN, totalAmountBN, transferableAmountBN } from '@/shared/lib/utils';

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
      required: amount,
      imbalance: afterFreeze.abs(),
    };
  }

  return {
    success: true,
    balance: updated,
    required: amount,
  };
}

function tryReserve(balance: Balance, amount: BN, transferableMode?: TransferableMode): BalanceUpdateResult {
  const reservable = reservableAmountBN(balance, transferableMode);
  const afterReservation = reservable.sub(amount);

  const updated = copyBalance(balance, {
    free: balance.free.sub(amount),
    reserved: balance.reserved.add(amount),
  });

  if (afterReservation.isNeg()) {
    return {
      success: false,
      balance: updated,
      required: amount,
      imbalance: afterReservation.abs(),
    };
  }

  return {
    success: true,
    balance: updated,
    required: amount,
  };
}

function tryWithdraw(balance: Balance, amount: BN, balancePreservation: BalancePreservation): BalanceUpdateResult {
  const withdrawable = transferableAmountBN(balance, balance.transferableMode);
  const wanted = balancePreservation === 'keepAlive' ? amount.add(balance.ed) : amount;
  const afterWithdraw = withdrawable.sub(wanted);

  // new

  if (afterWithdraw.isNeg()) {
    const updated = copyBalance(balance, {
      free: BN.max(BN_ZERO, balance.free.sub(wanted)),
    });

    return {
      success: false,
      balance: updated,
      required: amount,
      imbalance: afterWithdraw.abs(),
    };
  }

  return {
    success: true,
    balance: copyBalance(balance, {
      free: balance.free.sub(amount),
    }),
    required: amount,
  };
}

export const balanceService = {
  tryFreeze,
  tryWithdraw,
  tryReserve,
};
