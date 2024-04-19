import { BN } from '@polkadot/util';

import { ZERO_BALANCE, formatAmount } from '../utils';
import { Asset } from '../../core';

export const balanceValidation = {
  isNonZeroBalance,
  isLteThanBalance,
  insufficientBalanceForFee,
};

function isNonZeroBalance(value: string | BN): boolean {
  return value.toString() !== ZERO_BALANCE;
}

function isLteThanBalance(value: string | BN, balance: string | BN): boolean {
  const valueBN = new BN(value);
  const balanceBN = new BN(balance);

  return valueBN.lte(balanceBN);
}

function insufficientBalanceForFee(
  {
    amount,
    asset,
    balance,
    xcmFee,
    fee,

    isNative,
    isProxy,
    isMultisig,
    isXcm,
  }: {
    amount: string;
    asset: Asset;
    balance: string;
    xcmFee: string;
    fee: string;

    isNative: boolean;
    isProxy: boolean;
    isMultisig: boolean;
    isXcm: boolean;
  },
  config: { withFormatAmount: boolean } = { withFormatAmount: true },
) {
  const amountBN = new BN(
    isNative ? (config.withFormatAmount ? formatAmount(amount, asset.precision) : amount) : ZERO_BALANCE,
  );
  const feeBN = new BN(isProxy || isMultisig ? ZERO_BALANCE : fee);
  const xcmFeeBN = new BN(isXcm ? xcmFee : ZERO_BALANCE);
  const value = amountBN.add(feeBN).add(xcmFeeBN);

  return isLteThanBalance(value, balance);
}
