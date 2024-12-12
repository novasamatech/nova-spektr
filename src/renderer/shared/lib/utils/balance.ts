import { BN, BN_TEN, BN_ZERO } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';

import { type Asset, type AssetBalance, type Balance, LockTypes, type Unlocking } from '@/shared/core';

import { ZERO_BALANCE } from './constants';

const MAX_INTEGER = 15;

const enum Suffix {
  THOUSANDS = 'K',
  MILLIONS = 'M',
  BILLIONS = 'B',
  TRILLIONS = 'T',
}

export const enum Decimal {
  SMALL_NUMBER = 5,
  BIG_NUMBER = 2,
}

export const formatAmount = (amount: string, precision: number): string => {
  if (!amount) return ZERO_BALANCE;

  const isDecimalValue = amount.match(/^(\d+)\.(\d+)$/);
  const bnPrecision = new BN(precision);
  if (isDecimalValue) {
    const div = new BN(amount.replace(/\.\d*$/, ''));
    const modString = amount.replace(/^\d+\./, '').slice(0, precision);
    const mod = new BN(modString);

    return div
      .mul(BN_TEN.pow(bnPrecision))
      .add(mod.mul(BN_TEN.pow(new BN(precision - modString.length))))
      .toString();
  }

  return new BN(amount.replace(/\D/g, '')).mul(BN_TEN.pow(bnPrecision)).toString();
};

type FormatBalanceShorthands = Record<Suffix, boolean>;
type FormattedBalance = {
  value: string;
  suffix: string;
  decimalPlaces: number;
  formatted: string;
};
const defaultBalanceShorthands: FormatBalanceShorthands = {
  [Suffix.TRILLIONS]: true,
  [Suffix.BILLIONS]: true,
  [Suffix.MILLIONS]: true,
  [Suffix.THOUSANDS]: false,
};
export const formatBalance = (
  balance: string | BN = '0',
  precision = 0,
  shorthands: Partial<FormatBalanceShorthands> = defaultBalanceShorthands,
): FormattedBalance => {
  const mergedShorthands =
    shorthands === defaultBalanceShorthands ? defaultBalanceShorthands : { ...defaultBalanceShorthands, ...shorthands };

  const stringBalance = balance.toString();

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
  const bnBalance = new BNWithConfig(stringBalance).div(TEN.pow(bnPrecision));
  let divider = new BNWithConfig(1);
  let decimalPlaces = 0;
  let suffix = '';

  if (bnBalance.lt(1)) {
    decimalPlaces = Math.max(precision - stringBalance.length + 1, 5);
  } else if (bnBalance.lt(10)) {
    decimalPlaces = Decimal.SMALL_NUMBER;
  } else if (bnBalance.lt(1_000_000)) {
    decimalPlaces = Decimal.BIG_NUMBER;
    if (mergedShorthands[Suffix.THOUSANDS]) {
      divider = TEN.pow(new BNWithConfig(3));
      suffix = Suffix.THOUSANDS;
    }
  } else if (bnBalance.lt(1_000_000_000)) {
    decimalPlaces = Decimal.BIG_NUMBER;
    if (mergedShorthands[Suffix.MILLIONS]) {
      divider = TEN.pow(new BNWithConfig(6));
      suffix = Suffix.MILLIONS;
    }
  } else if (bnBalance.lt(1_000_000_000_000)) {
    decimalPlaces = Decimal.BIG_NUMBER;
    if (mergedShorthands[Suffix.BILLIONS]) {
      divider = TEN.pow(new BNWithConfig(9));
      suffix = Suffix.BILLIONS;
    }
  } else {
    decimalPlaces = Decimal.BIG_NUMBER;
    if (mergedShorthands[Suffix.TRILLIONS]) {
      divider = TEN.pow(new BNWithConfig(12));
      suffix = Suffix.TRILLIONS;
    }
  }

  const value = new BNWithConfig(bnBalance).div(divider).decimalPlaces(decimalPlaces).toFormat();

  return {
    value,
    suffix,
    decimalPlaces,
    formatted: formatGroups(value) + suffix,
  };
};

export const formatAsset = (
  value: BN | string,
  asset: Asset,
  shorthands: Partial<FormatBalanceShorthands> = defaultBalanceShorthands,
) => {
  return `${formatBalance(value, asset.precision, shorthands).formatted} ${asset.symbol}`;
};

export const toPrecision = (balance: string | BN, precision: number): BN => {
  return balance ? new BN(formatAmount(balance.toString(), precision)) : BN_ZERO;
};

export const toNumberWithPrecision = (value: number | BN, precision: number): number => {
  if (BN.isBN(value)) {
    const fixedValue = value.div(BN_TEN.pow(new BN(precision)));

    if (fixedValue.bitLength() >= 53) {
      return Number.MAX_SAFE_INTEGER;
    }

    return fixedValue.toNumber();
  }

  return value / 10 ** precision;
};

export const fromPrecision = (balance: string | BN, precision: number): string => {
  const stringBalance = balance.toString();

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
  const bnBalance = new BNWithConfig(stringBalance).div(TEN.pow(bnPrecision));
  let decimalPlaces = 0;

  if (bnBalance.lt(1)) {
    decimalPlaces = Math.max(precision - stringBalance.length + 1, 5);
  } else if (bnBalance.lt(10)) {
    decimalPlaces = Decimal.SMALL_NUMBER;
  } else if (bnBalance.lt(1_000_000)) {
    decimalPlaces = Decimal.BIG_NUMBER;
  } else if (bnBalance.lt(1_000_000_000)) {
    decimalPlaces = Decimal.BIG_NUMBER;
  } else if (bnBalance.lt(1_000_000_000_000)) {
    decimalPlaces = Decimal.BIG_NUMBER;
  } else {
    decimalPlaces = Decimal.BIG_NUMBER;
  }

  return new BNWithConfig(bnBalance).decimalPlaces(decimalPlaces).toFormat();
};

export const totalAmountBN = <T extends AssetBalance>(balance: T) => {
  if (!balance) return BN_ZERO;

  const bnFree = balance.free ? new BN(balance.free) : BN_ZERO;
  const bnReserved = balance.reserved ? new BN(balance.reserved) : BN_ZERO;

  return bnFree.add(bnReserved);
};

export const totalAmount = <T extends AssetBalance>(balance?: T): string => {
  return balance ? totalAmountBN(balance).toString() : ZERO_BALANCE;
};

export const lockedAmountBN = (balance: Balance): BN => {
  if (!balance.locked) return BN_ZERO;

  return balance.locked.reduce((acc, lock) => acc.add(lock.amount), BN_ZERO);
};

export const lockedAmount = (balance: Balance): string => {
  return lockedAmountBN(balance).toString();
};

export const transferableAmountBN = <T extends AssetBalance>(balance?: T): BN => {
  if (!balance?.free || !balance?.frozen || !balance?.reserved) return BN_ZERO;

  const { free, frozen, reserved } = balance;

  const diff = BN.max(BN_ZERO, frozen.sub(reserved));

  return BN.max(BN_ZERO, free.sub(diff));
};

export const transferableAmount = <T extends AssetBalance>(balance?: T): string => {
  return transferableAmountBN(balance).toString();
};

/**
 * Unlike transferableAmount, withdrawable skips reserved part of balance. It
 * could be usefull in operations where reserved part is already taken into
 * account.
 */
export const withdrawableAmountBN = <T extends AssetBalance>(balance?: T): BN => {
  if (!balance?.free || !balance?.frozen) return BN_ZERO;

  const { free, frozen } = balance;

  return BN.max(BN_ZERO, free.sub(frozen));
};

export const withdrawableAmount = <T extends AssetBalance>(balance?: T): string => {
  return withdrawableAmountBN(balance).toString();
};

export const stakedAmountBN = (balance: AssetBalance) => {
  if (!balance.locked) return BN_ZERO;

  const bnLocks = balance.locked
    .filter((lock) => lock.type === LockTypes.STAKING)
    .reduce((acc, lock) => acc.add(lock.amount), BN_ZERO);

  return bnLocks;
};

export const stakedAmount = (balance: Balance): string => {
  return stakedAmountBN(balance).toString();
};

export const stakeableAmountBN = (balance: AssetBalance) => {
  const total = totalAmountBN(balance);
  const staked = stakedAmountBN(balance);

  return BN.max(BN_ZERO, total.sub(staked));
};

export const stakeableAmount = (balance?: Balance): string => {
  return balance ? stakeableAmountBN(balance).toString() : ZERO_BALANCE;
};

export const unlockingAmount = (unlocking: Unlocking[] = []): string => {
  if (unlocking.length === 0) return ZERO_BALANCE;

  return unlocking.reduce((acc, s) => acc.add(new BN(s.value)), BN_ZERO).toString();
};

export const redeemableAmount = (unlocking: Unlocking[] = [], currentEra: number): string => {
  if (unlocking.length === 0) return ZERO_BALANCE;

  return unlocking
    .reduce((acc, s) => (currentEra >= Number(s.era) ? acc.add(new BN(s.value)) : acc), BN_ZERO)
    .toString();
};

const trimLeadingZeros = (amount: string) => {
  const withDecimal = amount.includes('.');

  return withDecimal ? amount : amount.replace(/^0+(?!$)/, '');
};

export const validateSymbols = (amount: string) => {
  return /^\d*\.?\d*$/.test(amount);
};

export const validatePrecision = (amount: string, precision: number) => {
  const [integer, decimal] = amount.split('.');
  if (decimal && decimal.length > precision) return false;

  return integer.length <= MAX_INTEGER;
};

export const formatGroups = (amount: string): string => {
  if (!amount) return '';

  const isNegative = amount.startsWith('-');
  if (isNegative) {
    amount = amount.slice(1);
  }

  const [integer, decimal] = amount.split('.');
  const groups = [];
  let index = integer.length;

  while (index > 0) {
    groups.push(integer.slice(Math.max(0, index - 3), index));
    index -= 3;
  }

  const result = groups.reverse().join(',') + (decimal || amount.includes('.') ? `.${decimal}` : '');

  return isNegative ? `-${result}` : result;
};

export const cleanAmount = (amount: string) => {
  return trimLeadingZeros(amount).replace(/,/g, '');
};

const getDecimalPlaceForFirstNonZeroChar = (value: string, nonZeroDigits = 3) => {
  const decimalPart = value.toString().split('.')[1];

  return Math.max((decimalPart || '').search(/[1-9]/) + nonZeroDigits, 5);
};

export const formatFiatBalance = (balance = '0', precision = 0): FormattedBalance => {
  if (Number(balance) === 0 || isNaN(Number(balance))) {
    return { value: ZERO_BALANCE, suffix: '', decimalPlaces: 0, formatted: ZERO_BALANCE };
  }
  const BNWithConfig = BigNumber.clone();
  BNWithConfig.config({
    ROUNDING_MODE: BNWithConfig.ROUND_DOWN,
    FORMAT: {
      decimalSeparator: '.',
      groupSeparator: '',
    },
  });

  const bnPrecision = new BNWithConfig(precision);
  const TEN = new BNWithConfig(10);
  const bnBalance = new BNWithConfig(balance).div(TEN.pow(bnPrecision));

  let divider = new BNWithConfig(1);
  let suffix = '';
  let decimalPlaces: number;

  if (bnBalance.lt(1)) {
    // if number has more than 7 digits in decimal part BigNumber.toString returns number in scientific notation
    decimalPlaces = getDecimalPlaceForFirstNonZeroChar(bnBalance.toFixed());
  } else if (bnBalance.lt(10)) {
    decimalPlaces = Decimal.SMALL_NUMBER;
  } else if (bnBalance.lt(1_000_000)) {
    decimalPlaces = Decimal.BIG_NUMBER;
  } else if (bnBalance.lt(1_000_000_000)) {
    decimalPlaces = Decimal.BIG_NUMBER;
    divider = TEN.pow(new BNWithConfig(6));
    suffix = Suffix.MILLIONS;
  } else if (bnBalance.lt(1_000_000_000_000)) {
    decimalPlaces = Decimal.BIG_NUMBER;
    divider = TEN.pow(new BNWithConfig(9));
    suffix = Suffix.BILLIONS;
  } else {
    decimalPlaces = Decimal.BIG_NUMBER;
    divider = TEN.pow(new BNWithConfig(12));
    suffix = Suffix.TRILLIONS;
  }

  const bnFiatBalance = new BNWithConfig(bnBalance).div(divider).decimalPlaces(decimalPlaces).toFormat();

  return {
    value: bnFiatBalance,
    suffix,
    decimalPlaces,
    formatted: bnFiatBalance + suffix,
  };
};

export const getRoundedValue = (assetBalance = '0', price: number, precision = 0, nonZeroDigits?: number): string => {
  if (Number(assetBalance) === 0 || isNaN(Number(assetBalance))) {
    return ZERO_BALANCE;
  }

  const fiatBalance = new BigNumber(price).multipliedBy(new BigNumber(assetBalance));
  const BNWithConfig = BigNumber.clone();
  BNWithConfig.config({
    ROUNDING_MODE: BNWithConfig.ROUND_DOWN,
  });

  const bnPrecision = new BNWithConfig(precision);
  const TEN = new BNWithConfig(10);
  const bnFiatBalance = new BNWithConfig(fiatBalance.toString()).div(TEN.pow(bnPrecision));

  if (bnFiatBalance.gte(1) && bnFiatBalance.lt(10)) {
    return bnFiatBalance.decimalPlaces(Decimal.SMALL_NUMBER).toString();
  } else if (bnFiatBalance.gt(10)) {
    return bnFiatBalance.decimalPlaces(Decimal.BIG_NUMBER).toString();
  }

  const decimalPlaces = getDecimalPlaceForFirstNonZeroChar(bnFiatBalance.toFixed(), nonZeroDigits);

  return bnFiatBalance.toFixed(decimalPlaces);
};

export const getBalanceBn = (balance: string, precision: number) => {
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
