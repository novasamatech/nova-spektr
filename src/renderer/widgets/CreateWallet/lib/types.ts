import { ChainId, Transaction } from '@shared/core';

export const enum Step {
  INIT,
  NAMETHRESHOLD,
  CONFIRM,
  SIGN,
  SUBMIT,
}

export type FormParams = {
  threshold: number;
  chain: ChainId;
  name: string;
};

export type FormSubmitEvent = {
  transactions: {
    wrappedTx: Transaction;
    multisigTx?: Transaction;
    coreTx: Transaction;
  };
  formData: FormParams & {
    fee: string;
    multisigDeposit: string;
  };
};
