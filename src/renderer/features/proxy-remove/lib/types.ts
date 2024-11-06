import { type Account, type Address, type Chain, type ProxyType } from '@/shared/core';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
  BASKET,
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
  delegate: Address;
  proxyType: ProxyType;
  delay: number;
};
