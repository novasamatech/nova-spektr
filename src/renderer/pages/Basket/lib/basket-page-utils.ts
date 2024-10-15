import { type BasketTransaction, TransactionType } from '@/shared/core';
import { isEditDelegationTransaction } from '@/entities/transaction';
import { Step } from '../types/basket-page-types';

import { getCoreTx } from './utils';

export const basketPageUtils = {
  isSelectStep,
  isSignStep,

  getTransactionType,
};

function isSelectStep(step: Step): boolean {
  return step === Step.SELECT;
}

function isSignStep(step: Step): boolean {
  return step === Step.SIGN;
}

function getTransactionType(transaction: BasketTransaction): TransactionType {
  const coreTx = getCoreTx(transaction);

  if (isEditDelegationTransaction(coreTx)) {
    return TransactionType.EDIT_DELEGATION;
  }

  return coreTx.type;
}
