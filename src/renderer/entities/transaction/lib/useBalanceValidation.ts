import { BN } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { Balance, useBalance } from '@renderer/entities/asset';
import { Transaction, useTransaction } from '@renderer/entities/transaction';
import { toAccountId, transferableAmount, ValidationErrors } from '@renderer/shared/lib/utils';
import { ChainId } from '@renderer/domain/shared-kernel';

type Props = {
  api?: ApiPromise;
  chainId: ChainId;
  transaction?: Transaction;
  assetId: string;
};

export const useBalanceValidation = ({ api, chainId, transaction, assetId }: Props) => {
  const [validationError, setValidationError] = useState<ValidationErrors>();
  const { getBalance } = useBalance();
  const { getTransactionFee } = useTransaction();

  if (!api || !transaction) return;

  useEffect(() => {
    validateBalance().then();
  }, [api, chainId, transaction, assetId]);

  const getTokenBalance = (): Promise<Balance | undefined> => {
    return getBalance(toAccountId(transaction.address), chainId, assetId.toString());
  };

  const getNativeTokenBalance = (): Promise<Balance | undefined> => {
    if (assetId === '0') return Promise.resolve(undefined);

    return getBalance(toAccountId(transaction.address), chainId, '0');
  };

  const validateBalanceForAmount = async (): Promise<boolean> => {
    const amount = transaction.args.value;
    const transferableBalance = transferableAmount(await getTokenBalance());

    return new BN(transferableBalance).gt(new BN(amount));
  };

  const validateBalanceForFee = async (): Promise<boolean> => {
    const amount = transaction.args.value;
    const nativeTokenBalance = await getNativeTokenBalance();
    const transferableBalance = transferableAmount(await getTokenBalance());
    const transferableNativeTokenBalance = transferableAmount(nativeTokenBalance);
    const fee = await getTransactionFee(transaction, api);

    return nativeTokenBalance
      ? new BN(transferableNativeTokenBalance).gt(new BN(fee))
      : new BN(transferableBalance).gt(new BN(fee).add(new BN(amount)));
  };

  const validateBalance = async (): Promise<void> => {
    const [balanceIsEnough, feeIsEnough] = await Promise.all([validateBalanceForAmount(), validateBalanceForFee()]);
    if (!balanceIsEnough) {
      setValidationError(ValidationErrors.INSUFFICIENT_BALANCE);
    }
    if (!feeIsEnough) {
      setValidationError(ValidationErrors.INSUFFICIENT_BALANCE_FOR_FEE);
    }
  };

  return validationError;
};
