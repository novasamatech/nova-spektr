import { type ApiPromise } from '@polkadot/api';

import { type Chain, type ProxyAccount, type ProxyType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
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
  proxyAccount: Omit<ProxyAccount, 'id' | 'delay'>;
  proxiedAccount: AnyAccount;
  spawner: AccountId;
  proxyType: ProxyType;
};
