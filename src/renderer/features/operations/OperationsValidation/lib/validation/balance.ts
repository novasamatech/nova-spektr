import { BN, BN_ZERO } from '@polkadot/util';

import { ZERO_BALANCE, formatAmount } from '@/shared/lib/utils';
import { type Config, type TransferFeeStore, type TransferXcmFeeStore } from '../../types/types';

export const balanceValidation = {
  isNonZeroBalance,
  isLteThanBalance,
  insufficientBalanceForFee,
  insufficientBalanceForXcmFee,
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
    fee,

    isNative,
    isProxy,
    isMultisig,
  }: TransferFeeStore,
  config: Config = { withFormatAmount: true },
) {
  if (!isNative) {
    return isLteThanBalance(fee, balance);
  }

  const amountBN = new BN(config.withFormatAmount ? formatAmount(amount, asset.precision) : amount);
  const feeBN = isProxy || isMultisig ? BN_ZERO : new BN(fee);

  return isLteThanBalance(amountBN.add(feeBN), balance);
}

function insufficientBalanceForXcmFee(
  {
    isXcm,
    isNative,
    nativeBalance,
    transferableAsset,
    transferableBalance,
    xcmFee,
    fee,
    isProxy,
    isMultisig,
    amount,
  }: TransferXcmFeeStore,
  config: Config = { withFormatAmount: true },
) {
  const amountBN = new BN(config.withFormatAmount ? formatAmount(amount, transferableAsset.precision) : amount);
  const xcmFeeBN = new BN(xcmFee || ZERO_BALANCE);
  const feeBN = new BN(fee || ZERO_BALANCE);

  let totalTransferableSpend;
  let totalNativeSpend;

  if (isNative) {
    totalTransferableSpend = isProxy || isMultisig ? amountBN : amountBN.add(feeBN);
    totalNativeSpend = xcmFeeBN;
  } else {
    totalTransferableSpend = isXcm ? amountBN.add(xcmFeeBN) : amountBN;
    totalNativeSpend = feeBN;
  }

  return (
    isLteThanBalance(totalTransferableSpend, transferableBalance) && isLteThanBalance(totalNativeSpend, nativeBalance)
  );
}
