import { BN } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';

import { Balance, IBalanceService } from '@renderer/entities/asset';
import { ITransactionService, Transaction } from '@renderer/entities/transaction';
import { toAccountId, transferableAmount, ValidationErrors } from '@renderer/shared/lib/utils';
import { ChainId } from '@renderer/domain/shared-kernel';
import { PartialBy } from '@renderer/domain/utility';
import { OperationError, OperationErrorType } from '@renderer/features/operation';

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  transaction: Transaction;
  assetId: string;
  getBalance: IBalanceService['getBalance'];
  getTransactionFee: ITransactionService['getTransactionFee'];
};

export const validateBalance = async (
  props: PartialBy<Props, 'transaction' | 'api'>,
): Promise<ValidationErrors | undefined> => {
  if (!props.api || !props.transaction) return;

  const [balanceIsEnough, feeIsEnough] = await Promise.all([
    validateBalanceForAmount(props as Props),
    validateBalanceForFee(props as Props),
  ]);
  if (!balanceIsEnough) {
    return ValidationErrors.INSUFFICIENT_BALANCE;
  }
  if (!feeIsEnough) {
    return ValidationErrors.INSUFFICIENT_BALANCE_FOR_FEE;
  }
};

const getTokenBalance = ({ getBalance, transaction, assetId, chainId }: Props): Promise<Balance | undefined> => {
  return getBalance(toAccountId(transaction.address), chainId, assetId.toString());
};

const getNativeTokenBalance = ({ assetId, transaction, chainId, getBalance }: Props): Promise<Balance | undefined> => {
  if (assetId === '0') return Promise.resolve(undefined);

  return getBalance(toAccountId(transaction.address), chainId, '0');
};

const validateBalanceForAmount = async ({ transaction, ...props }: Props): Promise<boolean> => {
  const amount = transaction.args.value;
  const tokenBalance = await getTokenBalance({ transaction, ...props });
  const transferableBalance = transferableAmount(tokenBalance);

  return new BN(transferableBalance).gte(new BN(amount));
};

const validateBalanceForFee = async ({ transaction, getTransactionFee, api, ...props }: Props): Promise<boolean> => {
  const amount = transaction.args.value;
  const nativeTokenBalance = await getNativeTokenBalance({ transaction, api, getTransactionFee, ...props });
  const tokenBalance = await getTokenBalance({ transaction, api, getTransactionFee, ...props });
  const transferableBalance = transferableAmount(tokenBalance);
  const transferableNativeTokenBalance = transferableAmount(nativeTokenBalance);
  const fee = await getTransactionFee(transaction, api);

  return nativeTokenBalance
    ? new BN(transferableNativeTokenBalance).gte(new BN(fee))
    : new BN(transferableBalance).gte(new BN(fee).add(new BN(amount)));
};

export const getOperationErrors = (
  isFeeInvalid: boolean,
  isDepositInvalid: boolean,
  hasOtherErrors?: boolean,
): OperationErrorType[] => {
  console.log('isFeeInvalid', isFeeInvalid);
  console.log('isDepositInvalid', isDepositInvalid);
  console.log('hasOtherErrors', hasOtherErrors);
  const errors: OperationErrorType[] = [];

  if (isDepositInvalid) {
    errors.push(OperationError.INVALID_DEPOSIT);
  }

  if (isFeeInvalid) {
    errors.push(OperationError.INVALID_FEE);
  }

  if (hasOtherErrors) {
    errors.push(OperationError.EMPTY_ERROR);
  }

  return errors;
};
