import { BN } from '@polkadot/util';

import { ZERO_BALANCE, formatAmount } from '@/shared/lib/utils';
import { type Config, type TransferFeeStore } from '../../types/types';

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
  }: TransferFeeStore,
  config: Config = { withFormatAmount: true },
) {
  const amountBN = new BN(
    isNative ? (config.withFormatAmount ? formatAmount(amount, asset.precision) : amount) : ZERO_BALANCE,
  );
  const feeBN = new BN(isProxy || isMultisig ? ZERO_BALANCE : fee);
  const xcmFeeBN = new BN(isXcm ? xcmFee : ZERO_BALANCE);
  const value = amountBN.add(feeBN).add(xcmFeeBN);

  return isLteThanBalance(value, balance);
}
