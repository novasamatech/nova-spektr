import type { Address, Chain, Account } from '@shared/core';
import { ProxyType } from '@shared/core';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
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
