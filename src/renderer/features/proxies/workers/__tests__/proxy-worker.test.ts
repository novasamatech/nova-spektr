import { type ApiPromise } from '@polkadot/api';
import set from 'lodash/set';

import {
  AccountType,
  type BaseAccount,
  type Chain,
  type ChainId,
  ChainType,
  type Connection,
  CryptoType,
  type ProxiedAccount,
  type ProxyAccount,
  ProxyVariant,
} from '@/shared/core';
import { proxyWorker, state } from '../proxy-worker';

jest.mock('@polkadot/rpc-provider', () => ({
  ScProvider: function () {
    throw new Error('Some error');
  },
  WsProvider: function () {
    throw new Error('Some error');
  },
}));

describe('features/proxies/workers/proxy-worker', () => {
  test('should reject if chain is not provided', async () => {
    try {
      await proxyWorker.initConnection();
      // If the promise is resolved, it means the test failed
      throw new Error('Expected promise to be rejected');
    } catch (error) {
      expect(error).toBeUndefined();
    }
  });

  test('should reject if provider is not connected', async () => {
    try {
      await proxyWorker.initConnection({} as Chain, {} as Connection);
      // If the promise is resolved, it means the test failed
      throw new Error('Expected promise to be rejected');
    } catch (error) {
      expect(error).toBeUndefined();
    }
  });

  test('should call disconnect if api exists and connected', async () => {
    const chainId = '0x00' as ChainId;
    const api = {
      isConnected: true,
      disconnect: jest.fn(),
    } as unknown as ApiPromise;
    state.apis = { [chainId]: api };

    await proxyWorker.disconnect(chainId);

    expect(api.disconnect).toHaveBeenCalled();
  });

  test('should return empty arrays and deposits object when api or api.query.proxy is not available', async () => {
    set(state.apis, '0x01.query', {});

    const chainId = '0x01';
    const accountsForProxy = {};
    const accountsForProxied = {};
    const proxiedAccounts = [] as ProxiedAccount[];
    const proxies = [] as ProxyAccount[];

    const result = await proxyWorker.getProxies({
      chainId,
      accountsForProxy,
      accountsForProxied,
      proxiedAccounts,
      proxies,
    });

    expect(result.proxiesToAdd).toEqual([]);
    expect(result.proxiesToRemove).toEqual([]);
    expect(result.proxiedAccountsToAdd).toEqual([]);
    expect(result.proxiedAccountsToRemove).toEqual([]);
    expect(result.deposits).toEqual({
      chainId: '0x01',
      deposits: {},
    });
  });

  test('should return empty arrays and deposits object when empty keys come from proxy.proxies.keys', async () => {
    set(state.apis, '0x01.query.proxy.proxies.keys', () => []);

    const chainId = '0x01';
    const accountsForProxy = {};
    const accountsForProxied = {};
    const proxiedAccounts = [] as ProxiedAccount[];
    const proxies = [] as ProxyAccount[];

    const result = await proxyWorker.getProxies({
      chainId,
      accountsForProxy,
      accountsForProxied,
      proxiedAccounts,
      proxies,
    });

    expect(result.proxiesToAdd).toEqual([]);
    expect(result.proxiesToRemove).toEqual([]);
    expect(result.proxiedAccountsToAdd).toEqual([]);
    expect(result.proxiedAccountsToRemove).toEqual([]);
    expect(result.deposits).toEqual({
      chainId: '0x01',
      deposits: {},
    });
  });

  test('should return array with account to remove ', async () => {
    const mockProxy = {
      id: 1,
      accountId: '0x02',
      chainId: '0x01',
      delay: 0,
      proxiedAccountId: '0x01',
      proxyType: 'Governance',
    };

    state.apis = {
      '0x01': {
        query: {
          proxy: {
            proxies: {
              keys: () => [],
            },
          },
        },
        rpc: {
          state: {
            queryStorageAt: () => [],
          },
        },
      } as unknown as ApiPromise,
    };

    const chainId = '0x01';

    const accountsForProxy = {
      '0x01': {
        id: 1,
        walletId: 1,
        name: 'Account 1',
        type: AccountType.BASE,
        accountId: '0x01',
        chainType: ChainType.SUBSTRATE,
        cryptoType: CryptoType.SR25519,
      } as BaseAccount,
    };
    const accountsForProxied = {};

    const proxiedAccounts = [] as ProxiedAccount[];
    const proxies = [mockProxy] as ProxyAccount[];

    const result = await proxyWorker.getProxies({
      chainId,
      accountsForProxy,
      accountsForProxied,
      proxiedAccounts,
      proxies,
    });

    expect(result.proxiesToAdd).toEqual([]);
    expect(result.proxiesToRemove).toEqual([mockProxy]);
    expect(result.proxiedAccountsToAdd).toEqual([]);
    expect(result.proxiedAccountsToRemove).toEqual([]);
    expect(result.deposits).toEqual({
      chainId: '0x01',
      deposits: {},
    });
  });

  test('should return array with proxied account to remove ', async () => {
    const mockProxied = {
      id: 1,
      walletId: 1,
      proxyAccountId: '0x02',
      chainId: '0x01',
      name: 'Proxied Account 1',
      type: AccountType.PROXIED,
      delay: 0,
      accountId: '0x01',
      chainType: ChainType.SUBSTRATE,
      cryptoType: CryptoType.SR25519,
      proxyType: 'Governance',
      proxyVariant: ProxyVariant.REGULAR,
    };

    state.apis = {
      '0x01': {
        query: {
          proxy: {
            proxies: {
              keys: () => [],
            },
          },
        },
        rpc: {
          state: {
            queryStorageAt: () => [],
          },
        },
      } as unknown as ApiPromise,
    };

    const chainId = '0x01';
    const accountsForProxy = {
      '0x01': {
        id: 1,
        walletId: 1,
        name: 'Account 1',
        type: AccountType.BASE,
        accountId: '0x01',
        chainType: ChainType.SUBSTRATE,
        cryptoType: CryptoType.SR25519,
      } as BaseAccount,
    };
    const accountsForProxied = {};

    const proxiedAccounts = [mockProxied] as ProxiedAccount[];
    const proxies = [] as ProxyAccount[];

    const result = await proxyWorker.getProxies({
      chainId,
      accountsForProxy,
      accountsForProxied,
      proxiedAccounts,
      proxies,
    });

    expect(result.proxiesToAdd).toEqual([]);
    expect(result.proxiesToRemove).toEqual([]);
    expect(result.proxiedAccountsToAdd).toEqual([]);
    expect(result.proxiedAccountsToRemove).toEqual([mockProxied]);
    expect(result.deposits).toEqual({
      chainId: '0x01',
      deposits: {},
    });
  });
});
