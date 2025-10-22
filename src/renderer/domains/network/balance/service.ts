import { BN, BN_ZERO } from '@polkadot/util';

import { AssetType, type Balance, type TransferableMode } from '@/shared/core';
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
      burned: BN_ZERO,
    };
  }

  return {
    success: true,
    balance: updated,
    required: amount,
    burned: BN_ZERO,
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
      burned: BN_ZERO,
    };
  }

  return {
    success: true,
    balance: updated,
    required: amount,
    burned: BN_ZERO,
  };
}

function tryWithdraw(balance: Balance, amount: BN, balancePreservation: BalancePreservation): BalanceUpdateResult {
  const transferable = transferableAmountBN(balance);

  const transferableImbalance = transferable.sub(amount);
  const countedTowardsEdImbalance =
    balancePreservation === 'keepAlive'
      ? calculateBalanceCountedTowardsEd(balance).sub(balance.ed.add(amount))
      : BN_ZERO;
  const totalImbalance = BN.min(transferableImbalance, countedTowardsEdImbalance);

  if (totalImbalance.isNeg()) {
    const updated = copyBalance(balance, {
      free: balancePreservation === 'keepAlive' ? balance.ed : BN_ZERO,
    });

    return {
      success: false,
      balance: updated,
      required: amount,
      imbalance: totalImbalance.abs(),
      burned: BN_ZERO,
    };
  }

  const free = balance.free.sub(amount);
  // in case of exceeding the ED, we burn all tokens
  const burnedTokens = free.lt(balance.ed) ? free : BN_ZERO;

  return {
    success: true,
    balance: copyBalance(balance, {
      free: BN.max(free.sub(burnedTokens), BN_ZERO),
    }),
    required: amount,
    burned: burnedTokens,
  };
}

function withdrawableAmount(balance: Balance, balancePreservation: BalancePreservation): BN {
  switch (balancePreservation) {
    case 'keepAlive': {
      const transferable = transferableAmountBN(balance);
      const countedTowardsEd = calculateBalanceCountedTowardsEd(balance).sub(balance.ed);

      return BN.max(BN_ZERO, BN.min(transferable, countedTowardsEd));
    }
    case 'allowDeath': {
      const transferable = transferableAmountBN(balance);
      return transferable;
    }
  }
}

function getPreservationStrategy(balance: Balance, balancePreservation: BalancePreservation) {
  // reset strategy to keep alive if withdraw will lead to account reaping
  return canDecrementProvider(balance) ? balancePreservation : 'keepAlive';
}

/**
 * True if the account has no outstanding consumer references or more than one
 * provider. This check is useful in context of balance preservation strategy.
 */
function canDecrementProvider(balance: Balance) {
  if (balance.assetType === AssetType.NATIVE) {
    return balance.consumers === 0 || balance.providers > 1;
  }
  return true;
}

function calculateBalanceCountedTowardsEd(balance: Balance, transferableMode?: TransferableMode): BN {
  const mode = transferableMode ?? balance.transferableMode;

  switch (mode) {
    case 'holdAndFreezes':
      return balance.free;
    case 'legacy':
      return totalAmountBN(balance);
  }
}

export const balanceService = {
  tryFreeze,
  tryWithdraw,
  tryReserve,
  calculateBalanceCountedTowardsEd,
  withdrawableAmount,
  getPreservationStrategy,
};
