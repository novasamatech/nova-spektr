import { ApiPromise } from '@polkadot/api';

import { ProxyWorkerCommands } from './consts';

export type GetProxyCommand = {
  type: ProxyWorkerCommands.GET_PROXIES;
  api: ApiPromise;
};
