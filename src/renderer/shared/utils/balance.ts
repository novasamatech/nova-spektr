import { BN, BN_TEN, BN_ZERO } from '@polkadot/util';
import BigNumber from 'bignumber.js';

import { Balance, LockTypes } from '@renderer/domain/balance';
import { Unlocking } from '@renderer/domain/stake';
import { ZERO_BALANCE } from './constants';

const MAX_INTEGER = 15;

const enum Suffix {
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

type FormattedBalance = {
  value: string;
  suffix: string;
  decimalPlaces: number;
};
export const formatBalance = (balance = '0', precision = 0): FormattedBalance => {
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
  const bnBalance = new BNWithConfig(balance).div(TEN.pow(bnPrecision));
  let divider = new BNWithConfig(1);
  let decimalPlaces = 0;
  let suffix = '';

  if (bnBalance.lt(1)) {
    decimalPlaces = Math.max(precision - balance.toString().length + 1, 5);
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

  return {
    value: new BNWithConfig(bnBalance).div(divider).decimalPlaces(decimalPlaces).toFormat(),
    suffix,
    decimalPlaces,
  };
};

export const totalAmount = (balance?: Balance): string => {
  if (!balance) return ZERO_BALANCE;

  const { free = ZERO_BALANCE, reserved = ZERO_BALANCE } = balance;

  return new BN(free).add(new BN(reserved)).toString();
};

export const lockedAmount = ({ locked = [] }: Balance): string => {
  const bnLocks = locked.map((lock) => new BN(lock.amount));
  const bnFrozen = bnLocks?.reduce((acc, bnLock) => acc.add(bnLock), new BN(0));

  return bnFrozen.toString();
};

export const transferableAmount = (balance?: Balance): string => {
  if (!balance) return ZERO_BALANCE;

  const { free = ZERO_BALANCE, frozen = ZERO_BALANCE } = balance;
  const bnFree = new BN(free);
  const bnFrozen = new BN(frozen);

  return bnFree.gt(bnFrozen) ? bnFree.sub(bnFrozen).toString() : ZERO_BALANCE;
};

const stakedAmount = ({ locked = [] }: Balance): string => {
  const bnLocks = locked.find((lock) => lock.type === LockTypes.STAKING);

  return bnLocks?.amount ?? ZERO_BALANCE;
};

export const stakeableAmount = (balance?: Balance): string => {
  if (!balance) return ZERO_BALANCE;

  const bnFree = new BN(balance.free || ZERO_BALANCE);
  const bnStaked = new BN(stakedAmount(balance));

  return bnFree.sub(bnStaked).toString();
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

  const [integer, decimal] = amount.split('.');
  const groups = [];
  let index = integer.length;

  while (index > 0) {
    groups.push(integer.slice(Math.max(0, index - 3), index));
    index -= 3;
  }

  return groups.reverse().join(',') + (decimal || amount.includes('.') ? `.${decimal}` : '');
};

export const cleanAmount = (amount: string) => {
  return trimLeadingZeros(amount).replace(/,/g, '');
};
