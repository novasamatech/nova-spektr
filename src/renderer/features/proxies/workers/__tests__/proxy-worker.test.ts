import { ApiPromise } from '@polkadot/api';

import { Chain, ChainId, Connection, ProxiedAccount, ProxyAccount } from '@shared/core';
import { proxyWorkerFunctions, state } from '../proxy-worker';

jest.mock('@polkadot/rpc-provider', () => ({
  ScProvider: function () {
    throw new Error('Some error');
  },
  WsProvider: function () {
    throw new Error('Some error');
  },
}));

describe('initConnection', () => {
  test('should reject if chain is not provided', async () => {
    try {
      await proxyWorkerFunctions.initConnection();
      // If the promise is resolved, it means the test failed
      throw new Error('Expected promise to be rejected');
    } catch (error) {
      expect(error).toBeUndefined();
    }
  });

  test('should reject if provider is not connected', async () => {
    try {
      await proxyWorkerFunctions.initConnection({} as Chain, {} as Connection);
      // If the promise is resolved, it means the test failed
      throw new Error('Expected promise to be rejected');
    } catch (error) {
      expect(error).toBeUndefined();
    }
  });

  test('should call disconnect if api exists and connected', async () => {
    // Arrange
    const chainId = '0x00' as ChainId; // Update with your test data
    const api = {
      isConnected: true,
      disconnect: jest.fn(),
    } as unknown as ApiPromise;
    state.apis = { [chainId]: api };

    // Act
    await proxyWorkerFunctions.disconnect(chainId);

    // Assert
    expect(api.disconnect).toHaveBeenCalled();
  });

  test('should return false if api is not connected', () => {
    const chainId = '0x01' as ChainId;
    state.apis = {
      '0x01': {
        isConnected: false,
      } as unknown as ApiPromise,
    };

    const result = proxyWorkerFunctions.getConnectionStatus(chainId);

    expect(result).toEqual(false);
  });

  test('should return true if api is connected', () => {
    const chainId = '0x01';
    state.apis = {
      '0x01': {
        isConnected: true,
      } as unknown as ApiPromise,
    };

    const result = proxyWorkerFunctions.getConnectionStatus(chainId);

    expect(result).toEqual(true);
  });

  test('should return empty arrays and deposits object when api or api.query.proxy is not available', async () => {
    state.apis = {
      '0x01': {
        query: {},
      } as unknown as ApiPromise,
    };

    const chainId = '0x01';
    const accounts = {};
    const proxiedAccounts = [] as ProxiedAccount[];
    const proxies = [] as ProxyAccount[];

    const result = await proxyWorkerFunctions.getProxies(chainId, accounts, proxiedAccounts, proxies);

    expect(result.proxiesToAdd).toEqual([]);
    expect(result.proxiesToRemove).toEqual([]);
    expect(result.proxiedAccountsToAdd).toEqual([]);
    expect(result.proxiedAccountsToRemove).toEqual([]);
    expect(result.deposits).toEqual({});
  });

  test('should return empty arrays and deposits object when empty keys come from proxy.proxies.keys', async () => {
    state.apis = {
      '0x01': {
        query: {
          proxy: {
            proxies: {
              keys: () => [],
            },
          },
        },
      } as unknown as ApiPromise,
    };

    const chainId = '0x01';
    const accounts = {};
    const proxiedAccounts = [] as ProxiedAccount[];
    const proxies = [] as ProxyAccount[];

    const result = await proxyWorkerFunctions.getProxies(chainId, accounts, proxiedAccounts, proxies);

    expect(result.proxiesToAdd).toEqual([]);
    expect(result.proxiesToRemove).toEqual([]);
    expect(result.proxiedAccountsToAdd).toEqual([]);
    expect(result.proxiedAccountsToRemove).toEqual([]);
    expect(result.deposits).toEqual({});
  });
});
