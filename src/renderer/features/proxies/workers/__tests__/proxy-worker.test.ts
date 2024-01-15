import { ApiPromise } from '@polkadot/api';

import {
  Account,
  AccountType,
  Chain,
  ChainId,
  ChainType,
  Connection,
  CryptoType,
  ProxiedAccount,
  ProxyAccount,
  ProxyVariant,
} from '@shared/core';
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
    expect(result.deposits).toEqual({
      chainId: '0x01',
      deposits: {},
    });
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
    expect(result.deposits).toEqual({
      chainId: '0x01',
      deposits: {},
    });
  });

  test('should return array with account and deposit object ', async () => {
    state.apis = {
      '0x01': {
        query: {
          proxy: {
            proxies: {
              keys: () => [
                {
                  args: [
                    {
                      toHex: () => '0x01',
                    },
                  ],
                },
              ],
            },
          },
        },
        rpc: {
          state: {
            queryStorageAt: () => [
              [
                {
                  toHuman: () => [
                    {
                      delegate: '0x02',
                      proxyType: 'Governance',
                      delay: 0,
                    },
                  ],
                },
                {
                  toHuman: () => '1,002,050,000,000',
                },
              ],
            ],
          },
        },
      } as unknown as ApiPromise,
    };

    const chainId = '0x01';
    const accounts = {
      '0x01': {
        id: 1,
        walletId: 1,
        name: 'Account 1',
        type: AccountType.BASE,
        accountId: '0x01',
        chainType: ChainType.SUBSTRATE,
        cryptoType: CryptoType.SR25519,
      } as Account,
    };
    const proxiedAccounts = [] as ProxiedAccount[];
    const proxies = [] as ProxyAccount[];

    const result = await proxyWorkerFunctions.getProxies(chainId, accounts, proxiedAccounts, proxies);

    expect(result.proxiesToAdd).toEqual([
      {
        accountId: '0x02',
        chainId: '0x01',
        delay: 0,
        proxiedAccountId: '0x01',
        proxyType: 'Governance',
      },
    ]);
    expect(result.proxiesToRemove).toEqual([]);
    expect(result.proxiedAccountsToAdd).toEqual([]);
    expect(result.proxiedAccountsToRemove).toEqual([]);
    expect(result.deposits).toEqual({
      chainId: '0x01',
      deposits: {
        '0x01': '1,002,050,000,000',
      },
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
    const accounts = {
      '0x01': {
        id: 1,
        walletId: 1,
        name: 'Account 1',
        type: AccountType.BASE,
        accountId: '0x01',
        chainType: ChainType.SUBSTRATE,
        cryptoType: CryptoType.SR25519,
      } as Account,
    };
    const proxiedAccounts = [] as ProxiedAccount[];
    const proxies = [mockProxy] as ProxyAccount[];

    const result = await proxyWorkerFunctions.getProxies(chainId, accounts, proxiedAccounts, proxies);

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
    const accounts = {
      '0x01': {
        id: 1,
        walletId: 1,
        name: 'Account 1',
        type: AccountType.BASE,
        accountId: '0x01',
        chainType: ChainType.SUBSTRATE,
        cryptoType: CryptoType.SR25519,
      } as Account,
    };
    const proxiedAccounts = [mockProxied] as ProxiedAccount[];
    const proxies = [] as ProxyAccount[];

    const result = await proxyWorkerFunctions.getProxies(chainId, accounts, proxiedAccounts, proxies);

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
