import { Address, Chain, Account, ProxyType } from '@shared/core';

export const enum Step {
  NONE,
  WARNING,
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

export type RemoveProxyStore = {
  chain: Chain;
  account: Account;
  signatory?: Account;
  spawner: Address;
  proxyType: ProxyType;
  description: string;
};
