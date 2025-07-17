import { type ApiPromise } from '@polkadot/api';

import { type Address, type Chain, type ProxiedAccount, type ProxyType } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';

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
  api: ApiPromise;
  chain: Chain;
  account: AnyAccount;
  proxiedAccount?: ProxiedAccount;
  signatory?: AnyAccount;
  spawner: Address;
  proxyType: ProxyType;
};
