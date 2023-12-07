import { ApiPromise } from '@polkadot/api';

import { ProxyWorkerCommands } from './consts';
import { AccountId, ChainId } from '@shared/core';

export type GetProxyCommand = {
  type: ProxyWorkerCommands.GET_PROXIES;
  api: ApiPromise;
};

export type ProxyAccount = {
  proxiedAccountId?: AccountId;
  accountId: AccountId;
  proxyType: string;
  delay: number;
};

export type ProxyStore = Record<ChainId, ProxyAccount[]>;
