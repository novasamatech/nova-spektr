import { Address, Chain, Account, ProxyType } from '@shared/core';

export const enum Step {
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

export type AddProxyStore = {
  chain: Chain;
  account: Account;
  signatory?: Account;
  delegate: Address;
  proxyType: ProxyType;
  description: string;
};

export type TxWrappers = ('proxy' | 'multisig')[];
