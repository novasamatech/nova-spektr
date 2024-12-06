import { type Account, type Address, type Chain, type ProxyType } from '@/shared/core';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
  BASKET,
}

export type AddProxyStore = {
  chain: Chain;
  account: Account;
  signatory: Account | null;
  delegate: Address;
  proxyType: ProxyType;
  proxyDeposit: string;
};
