import { ApiPromise } from '@polkadot/api';

import { ProxyWorkerCommands } from './constants';

export type GetProxyCommand = {
  type: ProxyWorkerCommands.GET_PROXIES;
  api: ApiPromise;
};
