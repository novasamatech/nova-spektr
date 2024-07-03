import { Account, Chain, Transaction } from '@shared/core';

export const enum Step {
  NAME_NETWORK,
  SIGNATORIES_THRESHOLD,
  CONFIRM,
  SIGN,
  SUBMIT,
}

export type FormParams = {
  threshold: number;
  chain: Chain;
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
