import { BN, BN_TEN } from '@polkadot/util';
import { encodeAddress } from '@polkadot/util-crypto';
import BigNumber from 'bignumber.js';

import { Balance } from '@renderer/domain/balance';
import { PublicKey } from '@renderer/domain/shared-kernel';
import {
  Decimal,
  LockTypes,
  SS58_DEFAULT_PREFIX,
  Suffix,
  ZERO_BALANCE,
} from '@renderer/services/balance/common/constants';
import { FormattedBalance } from './types';

/**
 * Generate new address based on public key and address prefix
 * @param publicKey account's public key
 * @param addressPrefix address prefix of needed chain
 */
export const toAddress = (publicKey?: PublicKey, addressPrefix?: number): string => {
  if (!publicKey) return '';

  return encodeAddress(publicKey, addressPrefix ?? SS58_DEFAULT_PREFIX);
};

export const formatAmount = (amount: string, precision: number): string => {
  if (!amount) return '0';

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

export const totalAmount = ({ free = '0', reserved = '0' }: Balance): string => {
  return new BN(free).add(new BN(reserved)).toString();
};

export const lockedAmount = ({ locked = [] }: Balance): string => {
  const bnLocks = locked.map((lock) => new BN(lock.amount));
  const bnFrozen = bnLocks?.reduce((acc, bnLock) => acc.add(bnLock), new BN(0));

  return bnFrozen.toString();
};

export const stakedAmount = ({ locked = [] }: Balance): string => {
  const bnLocks = locked.find((lock) => lock.type === LockTypes.STAKING);

  if (!bnLocks) return ZERO_BALANCE;

  return bnLocks.amount;
};

export const transferableAmount = (balance?: Balance): string => {
  if (!balance) {
    return '0';
  }

  const { free = '0', frozen = '0' } = balance;
  const bnFree = new BN(free);
  const bnFrozen = new BN(frozen);

  return bnFree.gt(bnFrozen) ? bnFree.sub(bnFrozen).toString() : ZERO_BALANCE;
};

export const stakeableAmount = (balance: Balance): string => {
  if (!balance) return ZERO_BALANCE;

  const bnFree = new BN(balance.free || 0);
  const bnStaked = new BN(stakedAmount(balance));

  return bnFree.sub(bnStaked).toString();
};
