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
    nativeBalance,
    transferableAsset,
    transferableBalance,
    fee,
    originFee,
    destinationFee,
    amount,

    isXcm,
    isNative,
    isProxy,
    isMultisig,
  }: TransferXcmFeeStore,
  config: Config = { withFormatAmount: true },
) {
  const isAuthority = isProxy || isMultisig;

  const amountBN = new BN(config.withFormatAmount ? formatAmount(amount, transferableAsset.precision) : amount);
  const originFeeBN = new BN(originFee || ZERO_BALANCE);
  const destinationFeeBN = new BN(destinationFee || ZERO_BALANCE);
  const feeBN = new BN(fee || ZERO_BALANCE);

  if (isNative) {
    const totalTransferableSpend = isAuthority
      ? amountBN.add(destinationFeeBN).add(originFeeBN)
      : amountBN.add(feeBN).add(destinationFeeBN).add(originFeeBN);

    return isLteThanBalance(totalTransferableSpend, transferableBalance);
  }

  const totalTransferableSpend = isXcm ? amountBN.add(originFeeBN) : amountBN;
  const totalNativeSpend = isAuthority ? destinationFeeBN : destinationFeeBN.add(feeBN);

  return (
    isLteThanBalance(totalTransferableSpend, transferableBalance) && isLteThanBalance(totalNativeSpend, nativeBalance)
  );
}

// Delivery fee check is included into insufficientBalanceForXcmFee
// this validation is only for Multisig and Proxy
function insufficientBalanceForDeliveryFee(
  {
    nativeBalance,
    transferableAsset,
    transferableBalance,
    originFee,
    destinationFee,
    amount,
    isNative,
  }: TransferXcmFeeStore,
  config: Config = { withFormatAmount: true },
) {
  const destinationFeeBN = new BN(destinationFee || ZERO_BALANCE);

  if (!isNative) {
    return isLteThanBalance(destinationFeeBN, nativeBalance);
  }

  const amountBN = new BN(config.withFormatAmount ? formatAmount(amount, transferableAsset.precision) : amount);
  const originFeeBN = new BN(originFee || ZERO_BALANCE);

  return isLteThanBalance(amountBN.add(destinationFeeBN).add(originFeeBN), transferableBalance);
}
