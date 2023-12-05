import { ApiPromise } from '@polkadot/api';

import { ProxyWorkerCommands } from './consts';
import { AccountId, ChainId } from '@shared/core';

export type GetProxyCommand = {
  type: ProxyWorkerCommands.GET_PROXIES;
  api: ApiPromise;
};

export type ProxyAccount = {
  delegate: string;
  proxyType: string;
  delay: number;
};

export type ProxiedAccount = {
  accounts: ProxyAccount[];
  deposit: string;
};

export type ProxyStore = Record<ChainId, Record<AccountId, ProxiedAccount>>;
