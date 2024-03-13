import { Address, Chain, Account, ProxyType } from '@shared/core';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
}

export const enum SubmitStep {
  LOADING,
  SUCCESS,
  ERROR,
}

export type TransferStore = {
  chain: Chain;
  account: Account;
  signatory?: Account;
  description: string;
};

export type TxWrappers = ('proxy' | 'multisig')[];
