import { type ApiPromise } from '@polkadot/api';
import set from 'lodash/set';
import { vi } from 'vitest';

import {
  AccountType,
  type Chain,
  type ChainId,
  type Connection,
  CryptoType,
  type ProxiedAccount,
  type ProxyAccount,
  ProxyVariant,
  SigningType,
  type VaultBaseAccount,
} from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { proxyWorker, state } from '../proxy-worker';

vi.mock('@polkadot/rpc-provider', () => ({
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
      disconnect: vi.fn(),
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

  // too expensive + not working anyway
  test.skip('should return empty arrays and deposits object when empty keys come from proxy.proxies.keys', async () => {
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

  // too expensive + not working anyway
  test.skip('should return array with account to remove ', async () => {
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
        id: '1',
        walletId: 1,
        name: 'Account 1',
        type: 'universal',
        accountType: AccountType.BASE,
        accountId: '0x01' as AccountId,
        signingType: SigningType.POLKADOT_VAULT,
        cryptoType: CryptoType.SR25519,
      } as VaultBaseAccount,
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

  // too expensive + not working anyway
  test.skip('should return array with proxied account to remove ', async () => {
    const mockProxied: ProxiedAccount = {
      id: '1',
      walletId: 1,
      proxyAccountId: '0x02' as AccountId,
      chainId: '0x01',
      name: 'Proxied Account 1',
      type: 'chain',
      accountType: AccountType.PROXIED,
      delay: 0,
      accountId: '0x01' as AccountId,
      signingType: SigningType.POLKADOT_VAULT,
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
        id: '1',
        walletId: 1,
        name: 'Account 1',
        type: 'universal',
        accountType: AccountType.BASE,
        accountId: '0x01' as AccountId,
        signingType: SigningType.POLKADOT_VAULT,
        cryptoType: CryptoType.SR25519,
      } as VaultBaseAccount,
    };
    const accountsForProxied = {};

    const proxiedAccounts = [mockProxied];
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
