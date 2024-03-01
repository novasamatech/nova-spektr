import { Address, ProxyType } from '@shared/core';

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
