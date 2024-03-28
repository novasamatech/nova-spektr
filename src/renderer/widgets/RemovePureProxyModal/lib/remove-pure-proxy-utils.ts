import { ApiPromise } from '@polkadot/api';

import { Step, TxWrappers } from './types';
import { Transaction } from '@entities/transaction';
import { wrapAsMulti, wrapAsProxy } from '@entities/transaction/lib/extrinsicService';
import type { Account, AccountId } from '@shared/core';
import { accountUtils } from '@entities/wallet';

export const removePureProxyUtils = {
  isNoneStep,
  isWarningStep,
  isInitStep,
  isConfirmStep,
  isSignStep,
  isSubmitStep,

  hasMultisig,
  hasProxy,

  getWrappedTransactions,
};

function isNoneStep(step: Step): boolean {
  return step === Step.NONE;
}

function isWarningStep(step: Step): boolean {
  return step === Step.WARNING;
}

function isInitStep(step: Step): boolean {
  return step === Step.INIT;
}

function isConfirmStep(step: Step): boolean {
  return step === Step.CONFIRM;
}

function isSignStep(step: Step): boolean {
  return step === Step.SIGN;
}

function isSubmitStep(step: Step): boolean {
  return step === Step.SUBMIT;
}

function hasMultisig(txWrappers: TxWrappers): boolean {
  return txWrappers.includes('multisig');
}

function hasProxy(txWrappers: TxWrappers): boolean {
  return txWrappers.includes('proxy');
}

type WrapperParams = {
  api: ApiPromise;
  addressPrefix: number;
  account?: Account;
  signerAccountId?: AccountId;
};
type WrappedTransactions = {
  transaction: Transaction;
  multisigTx: Transaction | null;
};
function getWrappedTransactions(
  txWrappers: TxWrappers,
  transaction: Transaction,
  { api, addressPrefix, account, signerAccountId }: WrapperParams,
): WrappedTransactions {
  const hasSignatory = account && accountUtils.isMultisigAccount(account) && signerAccountId;

  return txWrappers.reduce<WrappedTransactions>(
    (acc, wrapper) => {
      if (hasMultisig([wrapper]) && hasSignatory) {
        acc.transaction = wrapAsMulti(api, acc.transaction, account, signerAccountId, addressPrefix);
        acc.multisigTx = acc.transaction;
      }
      if (hasProxy([wrapper])) {
        acc.transaction = wrapAsProxy(api, acc.transaction, addressPrefix);
      }

      return acc;
    },
    { transaction, multisigTx: null },
  );
}
