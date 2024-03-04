import { Address, ProxyType } from '@shared/core';

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

export type ActiveProxy = {
  address: Address;
  proxyType: ProxyType;
};

export type TxWrappers = ('proxy' | 'multisig')[];
