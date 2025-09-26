/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Test file with mock data that doesn't match strict types
import { describe, expect, test } from 'vitest';

import {
  allAccounts,
  allChains,
  allWallets,
  proxiedAccount1,
  proxiedAccount2,
  proxiedAccount3,
  proxiedWallet1,
  proxiedWallet2,
  proxiedWallet3,
  syncResult,
  userAccount,
} from './__mocks__/sync.proxied.mocks';
import { syncProxiedAccounts } from './sync';

describe('syncProxiedAccounts', () => {
  test('should index all proxy accounts when initialised', () => {
    const result = syncProxiedAccounts({
      allWallets,
      allAccounts: [userAccount],
      allChains: allChains,
      syncResult,
      identities: {},
    });

    expect(result).toEqual({
      createWallets: [
        {
          wallet: { name: 'Any for pure 14osiU...duDPYj', type: 'wallet_pxd' },
          accounts: [
            {
              accountId: proxiedAccount1.accountId,
              accountType: proxiedAccount1.accountType,
              chainId: proxiedAccount1.chainId,
              connections: proxiedAccount1.connections,
              cryptoType: proxiedAccount1.cryptoType,
              deposit: proxiedAccount1.deposit,
              name: 'Any for pure 14osiU...duDPYj',
              proxyVariant: proxiedAccount1.proxyVariant,
              signingType: proxiedAccount1.signingType,
              type: proxiedAccount1.type,
            },
          ],
        },
        {
          wallet: { name: 'Any for pure 1T6zTs...4XrN8U', type: 'wallet_pxd' },
          accounts: [
            {
              accountId: proxiedAccount2.accountId,
              accountType: proxiedAccount2.accountType,
              chainId: proxiedAccount2.chainId,
              connections: proxiedAccount2.connections,
              cryptoType: proxiedAccount2.cryptoType,
              deposit: proxiedAccount2.deposit,
              name: 'Any for pure 1T6zTs...4XrN8U',
              proxyVariant: proxiedAccount2.proxyVariant,
              signingType: proxiedAccount2.signingType,
              type: proxiedAccount2.type,
            },
          ],
        },
        {
          wallet: { name: 'Any for pure 12pC5N...RoaoVD', type: 'wallet_pxd' },
          accounts: [
            {
              accountId: proxiedAccount3.accountId,
              accountType: proxiedAccount3.accountType,
              chainId: proxiedAccount3.chainId,
              connections: proxiedAccount3.connections,
              cryptoType: proxiedAccount3.cryptoType,
              deposit: proxiedAccount3.deposit,
              name: 'Any for pure 12pC5N...RoaoVD',
              proxyVariant: proxiedAccount3.proxyVariant,
              signingType: proxiedAccount3.signingType,
              type: proxiedAccount3.type,
            },
          ],
        },
      ],
      deleteWallets: [],
      updateAccounts: [],
    });
  });

  test('should stay immutable when DB is up to date', () => {
    const result = syncProxiedAccounts({
      allWallets,
      allAccounts,
      allChains: allChains,
      syncResult,
      identities: {},
    });

    expect(result).toEqual({
      createWallets: [],
      deleteWallets: [],
      updateAccounts: [],
    });
  });

  test('should delete wallet of non-existent proxy account', () => {
    const nonExistentProxiedAccount = {
      ...proxiedAccount1,
      accountId: '0xnonexistentaccountid123456789abcdef0000000000000000000000000000',
      walletId: 999,
      id: '999 0xnonexistentaccountid123456789abcdef0000000000000000000000000000 0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
    };

    const walletToDelete = {
      name: 'Non-existent Proxy Wallet',
      type: 'wallet_pxd',
      id: 999,
      accounts: [nonExistentProxiedAccount],
    };

    const result = syncProxiedAccounts({
      allWallets: [...allWallets, walletToDelete],
      allAccounts: [...allAccounts, nonExistentProxiedAccount],
      allChains: allChains,
      syncResult,
      identities: {},
    });

    expect(result.deleteWallets).toEqual([999]);
    expect(result.createWallets).toEqual([]);
  });

  test('should update account when deposit changes', () => {
    const modifiedSyncResult = {
      ...syncResult,
      accounts: [
        ...syncResult.accounts.filter((acc) => acc.accountId !== proxiedAccount1.accountId),
        {
          ...syncResult.accounts.find((acc) => acc.accountId === proxiedAccount1.accountId),
          deposit: '2002050000000', // Changed deposit
        },
      ],
    };

    const result = syncProxiedAccounts({
      allWallets,
      allAccounts,
      allChains: allChains,
      syncResult: modifiedSyncResult,
      identities: {},
    });

    expect(result.createWallets).toEqual([]);
    expect(result.deleteWallets).toEqual([]);
    expect(result.updateAccounts).toHaveLength(1);
    expect(result.updateAccounts[0].deposit).toBe('2002050000000');
  });

  test('should delete all proxy wallets when sync result accounts is empty', () => {
    const emptySyncResult = {
      ...syncResult,
      accounts: [],
    };

    const result = syncProxiedAccounts({
      allWallets,
      allAccounts: [proxiedAccount1, proxiedAccount2, proxiedAccount3],
      allChains: allChains,
      syncResult: emptySyncResult,
      identities: {},
    });

    expect(result.createWallets).toEqual([]);
    expect(result.deleteWallets).toEqual([proxiedWallet1.id, proxiedWallet2.id, proxiedWallet3.id]);
    expect(result.updateAccounts).toEqual([]);
  });

  test('should create wallet with default name when no identity exists', () => {
    const result = syncProxiedAccounts({
      allWallets,
      allAccounts: [userAccount],
      allChains: allChains,
      syncResult: {
        ...syncResult,
        accounts: [syncResult.accounts[0]], // Only first proxy
      },
      identities: {},
    });

    expect(result.createWallets).toHaveLength(1);
    expect(result.createWallets[0].wallet.name).toBe('Any for pure 14osiU...duDPYj');
    expect(result.createWallets[0].accounts[0].name).toBe('Any for pure 14osiU...duDPYj');
  });
});
