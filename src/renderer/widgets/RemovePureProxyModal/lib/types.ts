import { type Account, type Address, type Chain, type ProxiedAccount, type ProxyType } from '@/shared/core';

export const enum Step {
  NONE,
  WARNING,
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
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  spawner: Address;
  proxyType: ProxyType;
};
