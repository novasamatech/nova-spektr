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

export type AddProxyStore = {
  chain: Chain;
  account: Account;
  signatory?: Account;
  delegate: Address;
  proxyType: ProxyType;
  description: string;
  proxyDeposit: string;
};

export type TxWrappers = ('proxy' | 'multisig')[];
