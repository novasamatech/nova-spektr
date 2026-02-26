// @ts-nocheck - Test file with mock data that doesn't match strict types
import { describe, expect, test } from 'vitest';

import {
  allAccounts,
  allWallets,
  multisigAccount1,
  multisigAccount2,
  multisigAccount3,
  syncResult,
  userAccount,
} from './__mocks__/sync.multisig.mocks';
import { syncMultisigAccounts } from './sync';

describe('syncMultisigAccounts', () => {
  test('should index all multisig accounts when initialised', () => {
    const result = syncMultisigAccounts({
      allWallets,
      allAccounts: [userAccount],
      syncResult,
      identities: {},
    });

    expect(result).toEqual({
      createWallets: [
        {
          wallet: { name: '13HZ3...deSPH', type: 'wallet_ms' },
          accounts: [
            {
              accountId: multisigAccount1.accountId,
              accountType: multisigAccount1.accountType,
              cryptoType: multisigAccount1.cryptoType,
              name: '13HZ3...deSPH',
              signatories: multisigAccount1.signatories,
              signingType: multisigAccount1.signingType,
              threshold: multisigAccount1.threshold,
              type: multisigAccount1.type,
              createdAt: expect.any(Number),
            },
          ],
        },
        {
          wallet: { name: '13oKT...bKKxZ', type: 'wallet_ms' },
          accounts: [
            {
              accountId: multisigAccount2.accountId,
              accountType: multisigAccount2.accountType,
              cryptoType: multisigAccount2.cryptoType,
              name: '13oKT...bKKxZ',
              signatories: multisigAccount2.signatories,
              signingType: multisigAccount2.signingType,
              threshold: multisigAccount2.threshold,
              type: multisigAccount2.type,
              createdAt: expect.any(Number),
            },
          ],
        },
        {
          wallet: { name: '149AX...N4idM', type: 'wallet_ms' },
          accounts: [
            {
              accountId: multisigAccount3.accountId,
              accountType: multisigAccount3.accountType,
              cryptoType: multisigAccount3.cryptoType,
              name: '149AX...N4idM',
              signatories: multisigAccount3.signatories,
              signingType: multisigAccount3.signingType,
              threshold: multisigAccount3.threshold,
              type: multisigAccount3.type,
              createdAt: expect.any(Number),
            },
          ],
        },
      ],
      deleteWallets: [],
    });
  });

  test('should stay immutable when DB is up to date', () => {
    const result = syncMultisigAccounts({
      allWallets,
      allAccounts,
      syncResult,
      identities: {},
    });

    expect(result).toEqual({
      createWallets: [],
      deleteWallets: [],
    });
  });

  test('should delete wallet of non-existent multisig account', () => {
    const nonExistentMultisigAccount = {
      ...multisigAccount1,
      accountId: '0xnonexistentaccountid123456789abcdef0000000000000000000000000000',
      walletId: 999,
      id: '999 0xnonexistentaccountid123456789abcdef0000000000000000000000000000 universal',
    };

    const walletToDelete = {
      name: 'Non-existent Multisig Wallet',
      type: 'wallet_ms',
      id: 999,
      accounts: [nonExistentMultisigAccount],
    };

    const result = syncMultisigAccounts({
      allWallets: [...allWallets, walletToDelete],
      allAccounts: [...allAccounts, nonExistentMultisigAccount],
      syncResult,
      identities: {},
    });

    expect(result.deleteWallets).toEqual([999]);
    expect(result.createWallets).toEqual([]);
  });

  test('should not delete wallet if signatory list changes for existing multisig', () => {
    const modifiedSyncResult = {
      ...syncResult,
      accounts: [
        ...syncResult.accounts.filter((acc) => acc.accountId !== multisigAccount1.accountId),
        {
          type: 'multisig',
          accountId: multisigAccount1.accountId,
          signatories: [
            '0x589f4a92b7e88c0ac1172e429f12bde262d34fac77b0931eb94963996a207724',
            '0xdifferentsignatory123456789abcdef0000000000000000000000000000000',
          ],
          threshold: 2,
        },
      ],
    };

    const result = syncMultisigAccounts({
      allWallets,
      allAccounts,
      syncResult: modifiedSyncResult,
      identities: {},
    });

    expect(result.createWallets).toEqual([]);
    expect(result.deleteWallets).toEqual([]);
  });

  test('should delete multisig wallets when sync result accounts is empty and indexer has passed their block', () => {
    const emptySyncResult = {
      ...syncResult,
      accounts: [],
    };

    const result = syncMultisigAccounts({
      allWallets,
      allAccounts: [multisigAccount1, multisigAccount2, multisigAccount3],
      syncResult: emptySyncResult,
      identities: {},
    });

    expect(result.createWallets).toEqual([]);
    expect(result.deleteWallets).toEqual([10, 11, 12]);
  });

  test('should not delete multisig wallets when indexed blocks are missing', () => {
    const syncResultWithoutIndexedBlocks = {
      ...syncResult,
      indexedBlocks: new Map(),
    };

    const result = syncMultisigAccounts({
      allWallets,
      allAccounts: [multisigAccount1, multisigAccount2, multisigAccount3],
      syncResult: syncResultWithoutIndexedBlocks,
      identities: {},
    });

    expect(result.createWallets).toEqual([]);
    expect(result.deleteWallets).toEqual([]);
  });

  test('should create wallet with default name when no identity exists', () => {
    const result = syncMultisigAccounts({
      allWallets,
      allAccounts: [userAccount],
      syncResult: {
        ...syncResult,
        accounts: [syncResult.accounts[0]], // Only first multisig
      },
      identities: {},
    });

    expect(result.createWallets).toHaveLength(1);
    expect(result.createWallets[0].wallet.name).toBe('13HZ3...deSPH');
    expect(result.createWallets[0].accounts[0].name).toBe('13HZ3...deSPH');
  });

  test('should delete wallets based on indexed blocks', () => {
    const oldMultisigAccount = {
      ...multisigAccount1,
      blockNumber: 5000000, // Old block number
      remarkChainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
      walletId: 999,
      id: '999 0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251 universal',
    };

    const oldWallet = {
      name: 'Old Multisig Wallet',
      type: 'wallet_ms',
      id: 999,
      accounts: [oldMultisigAccount],
    };

    const result = syncMultisigAccounts({
      allWallets: [...allWallets, oldWallet],
      allAccounts: [...allAccounts, oldMultisigAccount],
      syncResult,
      identities: {},
    });

    expect(result.deleteWallets).toContain(999);
    expect(result.createWallets).toEqual([]);
  });

  test('should handle accounts without remarkChainId or blockNumber', () => {
    const accountWithoutMeta = {
      ...multisigAccount1,
      remarkChainId: undefined,
      blockNumber: undefined,
      walletId: 999,
      id: '999 0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251 universal',
    };

    const walletWithoutMeta = {
      name: 'Account Without Meta',
      type: 'wallet_ms',
      id: 999,
      accounts: [accountWithoutMeta],
    };

    const result = syncMultisigAccounts({
      allWallets: [...allWallets, walletWithoutMeta],
      allAccounts: [...allAccounts, accountWithoutMeta],
      syncResult,
      identities: {},
    });

    expect(result.deleteWallets).toContain(999);
    expect(result.createWallets).toEqual([]);
  });
});
