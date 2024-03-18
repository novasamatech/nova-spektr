import type { Account, Address, Chain, Asset } from '@shared/core';

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

export type NetworkStore = {
  chain: Chain;
  asset: Asset;
};

export type TransferStore = {
  account: Account;
  signatory?: Account;
  amount: string;
  destination: Address;
  description: string;
};

export type TxWrappers = ('proxy' | 'multisig')[];
