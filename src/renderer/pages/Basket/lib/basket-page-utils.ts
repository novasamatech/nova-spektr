import { BasketTransaction, TransactionType } from '@shared/core';
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
  const coreTx = getCoreTx(transaction, [TransactionType.UNSTAKE, TransactionType.BOND]);

  return coreTx.type;
}
