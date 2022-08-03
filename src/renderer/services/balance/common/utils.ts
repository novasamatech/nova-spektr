/* eslint-disable import/prefer-default-export */
import { BN, BN_TEN } from '@polkadot/util';
import BigNumber from 'bignumber.js';
import { HexString } from '@polkadot/util/types';
import { encodeAddress } from '@polkadot/util-crypto';

import { DEFAULT, Suffix, Decimal, SS58_DEFAULT_PREFIX } from './constants';
import { Asset, AssetType, OrmlExtras, StatemineExtras } from '@renderer/services/network/common/types';
import { Balance } from '@renderer/services/storage';

export const toAddress = (publicKey: HexString, prefix = SS58_DEFAULT_PREFIX): string => {
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

export const formatBalance = (balance: string, precision = 0): string => {
  const BNWithConfig = BigNumber.clone();
  BNWithConfig.config({
    // HOOK: for divide with decimal part
    DECIMAL_PLACES: precision || Decimal.SMALL_NUMBER,
    ROUNDING_MODE: BNWithConfig.ROUND_DOWN,
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

  return new BNWithConfig(bnBalance).div(divider).decimalPlaces(decimalPlaces).toFormat() + suffix;
};

export const formatBalanceFromAmount = (balance: string, precision = 0): string =>
  formatBalance(formatAmount(balance, precision), precision);

export const total = ({ free, reserved }: Balance): string => new BN(free).add(new BN(reserved)).toString();

export const transferable = ({ free, frozen }: Balance): string => {
  const bnFree = new BN(free);
  const bnFrozen = new BN(frozen);

  return bnFree.gt(bnFrozen) ? bnFree.sub(bnFrozen).toString() : '0';
};
