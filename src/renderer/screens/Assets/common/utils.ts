import { BN } from '@polkadot/util';
import BigNumber from 'bignumber.js';

import { Balance } from '@renderer/entities/asset/model/balance';
import { Decimal, totalAmount } from '@renderer/shared/lib/utils';
import { Asset } from '@renderer/entities/asset/model/asset';

export const sumBalances = (firstBalance: Balance, secondBalance?: Balance): Balance => {
  if (!secondBalance) return firstBalance;

  return {
    ...firstBalance,
    verified: firstBalance.verified && secondBalance.verified,
    free: sumValues(firstBalance.free, secondBalance.free),
    reserved: sumValues(firstBalance.reserved, secondBalance.reserved),
    frozen: sumValues(firstBalance.frozen, secondBalance.frozen),
    locked: (firstBalance.locked || []).concat(secondBalance.locked || []),
  };
};

export const sumValues = (firstValue?: string, secondValue?: string): string => {
  if (firstValue && secondValue) {
    return new BN(firstValue).add(new BN(secondValue)).toString();
  }

  return firstValue || '0';
};

const getBalanceBn = (balance: string, precision: number) => {
  const BNWithConfig = BigNumber.clone();
  BNWithConfig.config({
    // HOOK: for divide with decimal part
    DECIMAL_PLACES: precision || Decimal.SMALL_NUMBER,
    ROUNDING_MODE: BNWithConfig.ROUND_DOWN,
    FORMAT: {
      decimalSeparator: '.',
      groupSeparator: '',
    },
  });
  const TEN = new BNWithConfig(10);
  const bnPrecision = new BNWithConfig(precision);

  return new BNWithConfig(balance).div(TEN.pow(bnPrecision));
};

export const balanceSorter = (first: Asset, second: Asset, balancesObject: Record<string, Balance>) => {
  const firstTotal = totalAmount(balancesObject[first.assetId.toString()]);
  const secondTotal = totalAmount(balancesObject[second.assetId.toString()]);

  const firstBalance = getBalanceBn(firstTotal, first.precision);
  const secondBalance = getBalanceBn(secondTotal, second.precision);

  if (firstBalance.gt(secondBalance)) return -1;
  if (firstBalance.lt(secondBalance)) return 1;

  return first.name.localeCompare(second.name);
};
