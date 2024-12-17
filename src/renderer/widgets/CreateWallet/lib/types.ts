import { type Account, type ChainId, type Transaction } from '@/shared/core';

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

export interface SignatoryInfo {
  index: number;
  name: string;
  address: string;
  // Contact doesn't belong to wallet
  walletId?: string;
}
