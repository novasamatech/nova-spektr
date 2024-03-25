import { Chain, Account } from '@shared/core';

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

export type AddPureProxiedStore = {
  chain: Chain;
  account: Account;
  signatory?: Account;
  description: string;
  proxyDeposit: string;
};

export type TxWrappers = ('proxy' | 'multisig')[];
