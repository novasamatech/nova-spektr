import { type Transaction } from 'dexie';
import { beforeEach } from 'vitest';

import { migrateDuplicateVaultDerivations } from '@/shared/api/storage/migration';
import { TEST_ACCOUNTS } from '@/shared/lib/utils';
import {
  createProxiedAccount,
  createVaultBaseAccount,
  createVaultChainAccount,
  createWcAccount,
  polkadotAssetHubChainId,
  polkadotBifrostChainId,
  polkadotChainId,
} from '@/shared/mocks';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount } from '@/domains/network';

describe('Migration 12 - Remove duplicate accounts from PolkadotVault wallet', () => {
  const db = {
    accounts2: [] as AnyAccount[],
  };

  const transactionMock = {
    table: vi.fn().mockImplementation((tableName: 'accounts2') => {
      return {
        toArray: vi.fn(() => db[tableName]),

        bulkDelete: vi.fn().mockImplementation((ids: (number | string)[]) => {
          (db[tableName] as AnyAccount[]) = db[tableName].filter((record) => !ids.includes(record.id));
        }),
      };
    }),
  } as unknown as Transaction;

  beforeEach(() => {
    db.accounts2 = [];
  });

  it('should remove duplicate derivations with one wallet', async () => {
    const walletId = 1;

    let chainId = polkadotChainId;
    const uniqAccounts = [
      createVaultChainAccount('1', { walletId, derivationPath: '/test1', accountId: TEST_ACCOUNTS[0], chainId }),
      createVaultChainAccount('2', { walletId, derivationPath: '/test2', accountId: TEST_ACCOUNTS[0], chainId }),
      createVaultChainAccount('3', { walletId, derivationPath: '/test3', accountId: TEST_ACCOUNTS[0], chainId }),
    ];

    chainId = polkadotAssetHubChainId;
    const duplicateDerivations = [
      createVaultChainAccount('4', { walletId, derivationPath: '/test1', accountId: TEST_ACCOUNTS[0], chainId }),
      createVaultChainAccount('5', { walletId, derivationPath: '/test2', accountId: TEST_ACCOUNTS[0], chainId }),
      createVaultChainAccount('6', { walletId, derivationPath: '/test3', accountId: TEST_ACCOUNTS[0], chainId }),
    ];

    chainId = polkadotBifrostChainId;
    const duplicateDerivations2 = [
      createVaultChainAccount('7', { walletId, derivationPath: '/test1', accountId: TEST_ACCOUNTS[0], chainId }),
      createVaultChainAccount('8', { walletId, derivationPath: '/test2', accountId: TEST_ACCOUNTS[0], chainId }),
      createVaultChainAccount('9', { walletId, derivationPath: '/test3', accountId: TEST_ACCOUNTS[0], chainId }),
    ];

    db.accounts2 = [...uniqAccounts, ...duplicateDerivations, ...duplicateDerivations2];

    await migrateDuplicateVaultDerivations(transactionMock);

    expect(db.accounts2).toEqual(uniqAccounts);
  });

  it('should remove duplicate derivations with multiple wallets', async () => {
    const uniqAccounts = [
      createVaultChainAccount('1', {
        walletId: 1,
        derivationPath: '/test1',
        accountId: TEST_ACCOUNTS[1],
        chainId: polkadotChainId,
      }),
      createVaultChainAccount('1', {
        walletId: 2,
        derivationPath: '/test2',
        accountId: TEST_ACCOUNTS[2],
        chainId: polkadotChainId,
      }),
    ];

    const duplicateDerivations = [
      createVaultChainAccount('2', {
        walletId: 1,
        derivationPath: '/test1',
        accountId: TEST_ACCOUNTS[1],
        chainId: polkadotAssetHubChainId,
      }),
      createVaultChainAccount('2', {
        walletId: 2,
        derivationPath: '/test2',
        accountId: TEST_ACCOUNTS[2],
        chainId: polkadotAssetHubChainId,
      }),
    ];

    db.accounts2 = [...uniqAccounts, ...duplicateDerivations];

    await migrateDuplicateVaultDerivations(transactionMock);

    expect(db.accounts2).toEqual(uniqAccounts);
  });

  it('should skip accounts without derivations', async () => {
    const uniqAccounts = [
      createVaultChainAccount('1', { walletId: 1, derivationPath: '/test1', accountId: TEST_ACCOUNTS[0] }),
      createWcAccount('2', 2),
      createProxiedAccount('3', 3),
      createVaultBaseAccount('4', { walletId: 4, accountId: TEST_ACCOUNTS[0] }),
    ];

    db.accounts2 = [...uniqAccounts];

    await migrateDuplicateVaultDerivations(transactionMock);

    expect(db.accounts2).toEqual(uniqAccounts);
  });

  it('should handle empty accounts array', async () => {
    db.accounts2 = [];
    await migrateDuplicateVaultDerivations(transactionMock);

    expect(db.accounts2).toEqual([]);
  });
});
