import { type ApiPromise } from '@polkadot/api';

import { type Address, type Chain, type ProxiedAccount, type ProxyAccount, type ProxyType } from '@/shared/core';

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
  proxyAccount: ProxyAccount;
  proxiedAccount: ProxiedAccount;
  spawner: Address;
  proxyType: ProxyType;
};
