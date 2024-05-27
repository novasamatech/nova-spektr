import { Account, ChainId, Transaction } from '@shared/core';

export const enum Step {
  INIT,
  NAMETHRESHOLD,
  CONFIRM,
  SIGN,
  SUBMIT,
}

export type FormParams = {
  threshold: number;
  chainId: ChainId;
  name: string;
};

export type FormSubmitEvent = {
  transactions: {
    wrappedTx: Transaction;
    multisigTx?: Transaction;
    coreTx: Transaction;
  };
  formData: FormParams & {
    signer: Account;
    fee: string;
    multisigDeposit: string;
  };
};

export type AddMultisigStore = FormSubmitEvent['formData'];
