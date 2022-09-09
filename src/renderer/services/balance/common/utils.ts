/* eslint-disable import/prefer-default-export */
import { BN, BN_TEN } from '@polkadot/util';
import BigNumber from 'bignumber.js';
import { encodeAddress } from '@polkadot/util-crypto';

import { DEFAULT, Suffix, Decimal, SS58_DEFAULT_PREFIX, ZERO_BALANCE } from './constants';
import { Asset, AssetType, OrmlExtras, StatemineExtras } from '@renderer/domain/asset';
import { PublicKey } from '@renderer/domain/shared-kernel';
import { Balance } from '@renderer/domain/balance';

export const toAddress = (publicKey: PublicKey, prefix = SS58_DEFAULT_PREFIX): string => {
  if (!publicKey) return '';

  return encodeAddress(publicKey, prefix);
};

export const formatAmount = (amount: string, precision: number): string => {
  // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
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

export const getAssetId = (asset: Asset): string | number => {
  const assetId = {
    [AssetType.ORML]: () => (asset.typeExtras as OrmlExtras).currencyIdScale,
    [AssetType.STATEMINE]: () => (asset.typeExtras as StatemineExtras).assetId,
    [DEFAULT]: () => asset.assetId,
  };

  return assetId[asset.type || DEFAULT]();
};

type FormatedBalance = {
  value: string;
  suffix: string;
  decimalPlaces: number;
};

export const formatBalance = (balance: string, precision = 0): FormatedBalance => {
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

export const total = ({ free, reserved }: Balance): string => new BN(free || 0).add(new BN(reserved || 0)).toString();

export const locked = ({ locked }: Balance): string => {
  const bnLocks = (locked || []).map((lock) => new BN(lock.amount));
  const bnFrozen = bnLocks?.reduce((acc, bnLock) => acc.add(bnLock), new BN(0));

  return bnFrozen.toString();
};

export const transferable = (balance: Balance): string => {
  const bnFree = new BN(balance?.free || 0);
  const bnFrozen = new BN(balance?.frozen || 0);

  return bnFree.gt(bnFrozen) ? bnFree.sub(bnFrozen).toString() : ZERO_BALANCE;
};
