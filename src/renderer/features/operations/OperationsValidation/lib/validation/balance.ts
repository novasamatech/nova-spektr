import { BN } from '@polkadot/util';

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
    deliveryFee,

    isNative,
    isProxy,
    isMultisig,
    isXcm,
  }: TransferFeeStore,
  config: Config = { withFormatAmount: true },
) {
  const totalFee = new BN(fee).add(new BN(deliveryFee || ZERO_BALANCE));

  if (isXcm && !isNative && isLteThanBalance(totalFee, balance)) {
    return true;
  }

  const amountBN = new BN(config.withFormatAmount ? formatAmount(amount, asset.precision) : amount);
  const value = isProxy || isMultisig ? amountBN : amountBN.add(totalFee);

  return isLteThanBalance(value, balance);
}

function insufficientBalanceForXcmFee(
  {
    isXcm,
    isNative,
    nativeBalance,
    transferableAsset,
    transferableBalance,
    fee,
    xcmFee,
    deliveryFee,
    isProxy,
    isMultisig,
    amount,
  }: TransferXcmFeeStore,
  config: Config = { withFormatAmount: true },
) {
  const amountBN = new BN(config.withFormatAmount ? formatAmount(amount, transferableAsset.precision) : amount);
  const xcmFeeBN = new BN(xcmFee || ZERO_BALANCE);
  const deliveryFeeBN = new BN(deliveryFee || ZERO_BALANCE);
  const feeBN = new BN(fee || ZERO_BALANCE);

  let totalTransferableSpend;
  let totalNativeSpend;

  if (isNative) {
    totalTransferableSpend = isProxy || isMultisig ? amountBN : amountBN.add(feeBN).add(deliveryFeeBN);
    totalNativeSpend = xcmFeeBN;
  } else {
    totalTransferableSpend = isXcm ? amountBN.add(xcmFeeBN) : amountBN;
    totalNativeSpend = feeBN.add(deliveryFeeBN);
  }

  return (
    isLteThanBalance(totalTransferableSpend, transferableBalance) && isLteThanBalance(totalNativeSpend, nativeBalance)
  );
}
