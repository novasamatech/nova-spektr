import { Address, ProxyType, Chain, Account } from '@shared/core';

export const enum Step {
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
}

export type ActiveProxy = {
  address: Address;
  proxyType: ProxyType;
};

export type TxWrapper = ('proxy' | 'multisig')[];

export type FormValues = {
  network: Chain;
  account: Account;
  signatory: Account;
  delegate: Address;
  proxyType: ProxyType;
  description: string;
};
