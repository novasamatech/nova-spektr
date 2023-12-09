import type { ProxyAccount } from '../../../core';
import { IProxyStorage, TProxy } from '../common/types';
import { dexieStorage } from './dexie';

const useProxyStorage = (db: TProxy): IProxyStorage => ({
  readAll: (): Promise<ProxyAccount[]> => {
    return db.toArray();
  },

  createAll: (proxies: ProxyAccount[]): Promise<string[]> => {
    return db.bulkPut(proxies);
  },

  deleteAll: (proxies: ProxyAccount[]): Promise<void> => {
    return db.bulkDelete(
      proxies.map(({ accountId, proxyAccountId, chainId, proxyType }) => [
        accountId,
        proxyAccountId,
        chainId,
        proxyType,
      ]),
    );
  },
});

export const proxyStorage = useProxyStorage(dexieStorage.proxies);
