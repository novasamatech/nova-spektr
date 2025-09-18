import { BN, BN_ZERO } from '@polkadot/util';

import { ZERO_BALANCE, formatAmount } from '@/shared/lib/utils';
import { type Config, type TransferFeeStore, type TransferXcmFeeStore } from '../../types/types';

export const balanceValidation = {
  isNonZeroBalance,
  isLteThanBalance,
  insufficientBalanceForFee,
  insufficientBalanceForXcmFee,
  insufficientBalanceForDeliveryFee,
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
    isAnyMultisig,
  }: TransferFeeStore,
  config: Config = { withFormatAmount: true },
) {
  if (!isNative) {
    return isLteThanBalance(fee, balance);
  }

  const amountBN = new BN(config.withFormatAmount ? formatAmount(amount, asset.precision) : amount);
  const feeBN = isProxy || isAnyMultisig ? BN_ZERO : new BN(fee);

  return isLteThanBalance(amountBN.add(feeBN), balance);
}

function insufficientBalanceForXcmFee(
  {
    nativeBalance,
    transferableAsset,
    transferableBalance,
    fee,
    xcmFee,
    deliveryFee,
    amount,

    isXcm,
    isNative,
    isProxy,
    isAnyMultisig,
  }: TransferXcmFeeStore,
  config: Config = { withFormatAmount: true },
) {
  const isAuthority = isProxy || isAnyMultisig;

  const amountBN = new BN(config.withFormatAmount ? formatAmount(amount, transferableAsset.precision) : amount);
  const xcmFeeBN = new BN(xcmFee || ZERO_BALANCE);
  const deliveryFeeBN = new BN(deliveryFee || ZERO_BALANCE);
  const feeBN = new BN(fee || ZERO_BALANCE);

  if (isNative) {
    const totalTransferableSpend = isAuthority
      ? amountBN.add(deliveryFeeBN).add(xcmFeeBN)
      : amountBN.add(feeBN).add(deliveryFeeBN).add(xcmFeeBN);

    return isLteThanBalance(totalTransferableSpend, transferableBalance);
  }

  const totalTransferableSpend = isXcm ? amountBN.add(xcmFeeBN) : amountBN;
  const totalNativeSpend = isAuthority ? deliveryFeeBN : deliveryFeeBN.add(feeBN);

  return (
    isLteThanBalance(totalTransferableSpend, transferableBalance) && isLteThanBalance(totalNativeSpend, nativeBalance)
  );
}

// Delivery fee check is included into insufficientBalanceForXcmFee
// this validation is only for Multisig and Proxy
function insufficientBalanceForDeliveryFee(
  { nativeBalance, transferableAsset, transferableBalance, xcmFee, deliveryFee, amount, isNative }: TransferXcmFeeStore,
  config: Config = { withFormatAmount: true },
) {
  const deliveryFeeBN = new BN(deliveryFee || ZERO_BALANCE);

  if (!isNative) {
    return isLteThanBalance(deliveryFeeBN, nativeBalance);
  }

  const amountBN = new BN(config.withFormatAmount ? formatAmount(amount, transferableAsset.precision) : amount);
  const xcmFeeBN = new BN(xcmFee || ZERO_BALANCE);

  return isLteThanBalance(amountBN.add(deliveryFeeBN).add(xcmFeeBN), transferableBalance);
}
