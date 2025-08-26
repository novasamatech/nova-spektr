import { type Transaction } from 'dexie';
import { beforeEach } from 'vitest';

import { migrateMultishardAccounts } from '@/shared/api/storage/migration';
import { type VaultChainAccount, type Wallet } from '@/shared/core';
import { TEST_ACCOUNTS, merge } from '@/shared/lib/utils';
import {
  createLegacyMultishardWallet,
  createPolkadotWallet,
  createSingleShardWallet,
  createVaultBaseAccount,
  createVaultChainAccount,
} from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount } from '@/domains/network';

type OldChainAccount = VaultChainAccount & { baseAccountId?: AccountId };

describe('Migration 6 - Convert all Multishard wallets to PolkadotVault or SingleShard wallets', () => {
  const WALLET_NAME = 'Old wallet';

  const BASE_ACCOUNT_1 = TEST_ACCOUNTS[0];
  const BASE_ACCOUNT_2 = TEST_ACCOUNTS[1];
  const TEST_ACCOUNT = TEST_ACCOUNTS[3];

  const db = {
    wallets: [] as Wallet[],
    accounts2: [] as AnyAccount[],
  };

  const transactionMock = {
    table: vi.fn().mockImplementation((tableName: 'wallets' | 'accounts2') => {
      return {
        toArray: vi.fn(() => db[tableName]),

        bulkDelete: vi.fn().mockImplementation((ids: (number | string)[]) => {
          (db[tableName] as (Wallet | AnyAccount)[]) = db[tableName].filter((record) => !ids.includes(record.id));
        }),

        bulkPut: vi.fn().mockImplementation((items: (Wallet | AnyAccount)[]) => {
          (db[tableName] as (Wallet | AnyAccount)[]) = merge({
            a: db[tableName],
            b: items,
            mergeBy: (i) => i.id,
            merge: (_, b) => b,
          });
        }),

        bulkAdd: vi.fn().mockImplementation((items: (Wallet | AnyAccount)[], params?: { allKeys: boolean }) => {
          if (params?.allKeys && tableName === 'wallets') {
            return items.map((item, index) => {
              const newId = 5_000 + index;
              (db[tableName] as Wallet[]).push({ ...item, id: newId } as Wallet);
              return newId;
            });
          }

          if (params?.allKeys && tableName === 'accounts2') {
            throw new Error('Accounts cannot be added without constructed ID');
          }

          (db[tableName] as (Wallet | AnyAccount)[]).push(...items);
        }),
      };
    }),
  } as unknown as Transaction;

  beforeEach(() => {
    db.wallets = [];
    db.accounts2 = [];
  });

  it('should convert Pure Multishard to SingleShard', async () => {
    db.wallets = [createLegacyMultishardWallet(1, { name: WALLET_NAME })];

    db.accounts2 = [
      {
        ...createVaultChainAccount('1', { walletId: 1, derivationPath: '', accountId: BASE_ACCOUNT_1 }),
        baseAccountId: BASE_ACCOUNT_1,
      } as OldChainAccount,
      {
        ...createVaultChainAccount('2', { walletId: 1, derivationPath: '', accountId: BASE_ACCOUNT_1 }),
        baseAccountId: BASE_ACCOUNT_1,
      } as OldChainAccount,

      createVaultBaseAccount('3', { walletId: 1, accountId: BASE_ACCOUNT_1 }),
    ];

    const newWallets = [
      createSingleShardWallet(5000, {
        name: `${db.wallets[0].name} - ${db.accounts2[2].name}`,
        rootAccountId: BASE_ACCOUNT_1,
      }),
    ];

    const newAccounts = [createVaultBaseAccount('1', { walletId: 5000, accountId: BASE_ACCOUNT_1 })];

    await migrateMultishardAccounts(transactionMock);

    expect(db.wallets).toEqual(newWallets);
    expect(db.accounts2).toEqual(newAccounts);
  });

  it('should convert Pure Multishard to Polkadot Vault', async () => {
    db.wallets = [createLegacyMultishardWallet(1, { name: WALLET_NAME })];

    db.accounts2 = [
      {
        ...createVaultChainAccount('1', { walletId: 1, derivationPath: '//dot/1' }),
        baseAccountId: BASE_ACCOUNT_1,
      } as OldChainAccount,
      {
        ...createVaultChainAccount('2', { walletId: 1, derivationPath: '//dot/2' }),
        baseAccountId: BASE_ACCOUNT_1,
      } as OldChainAccount,

      createVaultBaseAccount('3', { walletId: 1, accountId: BASE_ACCOUNT_1 }),

      {
        ...createVaultChainAccount('4', { walletId: 1, derivationPath: '', accountId: BASE_ACCOUNT_1 }),
        baseAccountId: BASE_ACCOUNT_1,
      } as OldChainAccount,

      {
        ...createVaultChainAccount('5', { walletId: 1, derivationPath: '', accountId: BASE_ACCOUNT_1 }),
        baseAccountId: BASE_ACCOUNT_1,
      } as OldChainAccount,
    ];

    const newWallets = [
      createPolkadotWallet(5000, {
        name: `${db.wallets[0].name} - ${db.accounts2[2].name}`,
        rootAccountId: BASE_ACCOUNT_1,
      }),
    ];

    const newAccounts = [
      createVaultChainAccount('1', { walletId: 5000, derivationPath: '//dot/1' }),
      createVaultChainAccount('2', { walletId: 5000, derivationPath: '//dot/2' }),
    ];

    await migrateMultishardAccounts(transactionMock);

    expect(db.wallets).toEqual(newWallets);
    expect(db.accounts2).toEqual(newAccounts);
  });

  it('should convert Pure Multishard to Polkadot Vault (same derivation path)', async () => {
    db.wallets = [createLegacyMultishardWallet(1, { name: WALLET_NAME })];

    db.accounts2 = [
      {
        ...createVaultChainAccount('1', { walletId: 1, derivationPath: '//dot/1', accountId: TEST_ACCOUNT }),
        baseAccountId: BASE_ACCOUNT_1,
      } as OldChainAccount,
      {
        ...createVaultChainAccount('2', { walletId: 1, derivationPath: '//dot/1', accountId: TEST_ACCOUNT }),
        baseAccountId: BASE_ACCOUNT_1,
      } as OldChainAccount,

      createVaultBaseAccount('3', { walletId: 1, accountId: BASE_ACCOUNT_1 }),
    ];

    const newWallets = [
      createPolkadotWallet(5000, {
        name: `${db.wallets[0].name} - ${db.accounts2[2].name}`,
        rootAccountId: BASE_ACCOUNT_1,
      }),
    ];

    const newAccounts = [
      createVaultChainAccount('1', {
        walletId: 5000,
        derivationPath: '//dot/1',
        accountId: TEST_ACCOUNT,
      }),
    ];

    await migrateMultishardAccounts(transactionMock);

    expect(db.wallets).toEqual(newWallets);
    expect(db.accounts2).toEqual(newAccounts);
  });

  it('should convert 2 Pure Multishards to Polkadot Vault (duplicated accounts)', async () => {
    db.wallets = [
      createLegacyMultishardWallet(1, { name: WALLET_NAME }),
      createLegacyMultishardWallet(2, { name: 'Duplicated accounts' }),
    ];

    db.accounts2 = [
      {
        ...createVaultChainAccount('1', { walletId: 1, derivationPath: '//dot/1' }),
        baseAccountId: BASE_ACCOUNT_1,
      } as OldChainAccount,
      {
        ...createVaultChainAccount('2', { walletId: 1, derivationPath: '//dot/2' }),
        baseAccountId: BASE_ACCOUNT_1,
      } as OldChainAccount,

      createVaultBaseAccount('3', { walletId: 1, accountId: BASE_ACCOUNT_1 }),

      {
        ...createVaultChainAccount('4', { walletId: 2, derivationPath: '', accountId: BASE_ACCOUNT_1 }),
        baseAccountId: BASE_ACCOUNT_1,
      } as OldChainAccount,
      {
        ...createVaultChainAccount('5', { walletId: 2, derivationPath: '', accountId: BASE_ACCOUNT_1 }),
        baseAccountId: BASE_ACCOUNT_1,
      } as OldChainAccount,

      createVaultBaseAccount('6', { walletId: 2, accountId: BASE_ACCOUNT_1 }),
    ];

    const newWallets = [
      createPolkadotWallet(5000, {
        name: `${db.wallets[0].name} - ${db.accounts2[2].name}`,
        rootAccountId: BASE_ACCOUNT_1,
      }),
    ];

    const newAccounts = [
      createVaultChainAccount('1', { walletId: 5000, derivationPath: '//dot/1' }),
      createVaultChainAccount('2', { walletId: 5000, derivationPath: '//dot/2' }),
    ];

    await migrateMultishardAccounts(transactionMock);

    expect(db.wallets).toEqual(newWallets);
    expect(db.accounts2).toEqual(newAccounts);
  });

  it('should convert Migrated Multishard to Polkadot Vault + SingleShard', async () => {
    db.wallets = [createLegacyMultishardWallet(1, { name: WALLET_NAME, rootAccountId: BASE_ACCOUNT_1 })];

    db.accounts2 = [
      {
        ...createVaultChainAccount('1', { walletId: 1, derivationPath: '//dot/1' }),
        baseAccountId: BASE_ACCOUNT_1,
      } as OldChainAccount,
      {
        ...createVaultChainAccount('2', { walletId: 1, derivationPath: '//dot/2' }),
        baseAccountId: BASE_ACCOUNT_1,
      } as OldChainAccount,

      createVaultBaseAccount('3', { walletId: 1, accountId: BASE_ACCOUNT_2 }),

      {
        ...createVaultChainAccount('4', { walletId: 1, derivationPath: '', accountId: BASE_ACCOUNT_2 }),
        baseAccountId: BASE_ACCOUNT_2,
      } as OldChainAccount,

      {
        ...createVaultChainAccount('5', { walletId: 1, derivationPath: '', accountId: BASE_ACCOUNT_2 }),
        baseAccountId: BASE_ACCOUNT_2,
      } as OldChainAccount,
    ];

    const newWallets = [
      createPolkadotWallet(1, {
        name: db.wallets[0].name,
        rootAccountId: BASE_ACCOUNT_1,
      }),

      createSingleShardWallet(5000, {
        name: `${db.wallets[0].name} - ${db.accounts2[2].name}`,
        rootAccountId: BASE_ACCOUNT_2,
      }),
    ];

    const newAccounts = [
      createVaultChainAccount('1', { walletId: 1, derivationPath: '//dot/1' }),
      createVaultChainAccount('2', { walletId: 1, derivationPath: '//dot/2' }),

      createVaultBaseAccount('4', { walletId: 5000, name: db.accounts2[3].name, accountId: BASE_ACCOUNT_2 }),
    ];

    await migrateMultishardAccounts(transactionMock);

    expect(db.wallets).toEqual(newWallets);
    expect(db.accounts2).toEqual(newAccounts);
  });

  it('should convert Migrated Multishard to 2 Polkadot Vault', async () => {
    db.wallets = [createLegacyMultishardWallet(1, { name: WALLET_NAME, rootAccountId: BASE_ACCOUNT_1 })];

    db.accounts2 = [
      {
        ...createVaultChainAccount('1', { walletId: 1, derivationPath: '//dot/1' }),
        baseAccountId: BASE_ACCOUNT_1,
      } as OldChainAccount,
      {
        ...createVaultChainAccount('2', { walletId: 1, derivationPath: '//dot/2' }),
        baseAccountId: BASE_ACCOUNT_1,
      } as OldChainAccount,

      createVaultBaseAccount('3', { walletId: 1, accountId: BASE_ACCOUNT_2 }),

      {
        ...createVaultChainAccount('4', { walletId: 1, derivationPath: '//dot/3' }),
        baseAccountId: BASE_ACCOUNT_2,
      } as OldChainAccount,
      {
        ...createVaultChainAccount('5', { walletId: 1, derivationPath: '//dot/4' }),
        baseAccountId: BASE_ACCOUNT_2,
      } as OldChainAccount,
    ];

    const newWallets = [
      createPolkadotWallet(1, {
        name: db.wallets[0].name,
        rootAccountId: BASE_ACCOUNT_1,
      }),

      createPolkadotWallet(5000, {
        name: `${db.wallets[0].name} - ${db.accounts2[2].name}`,
        rootAccountId: BASE_ACCOUNT_2,
      }),
    ];

    const newAccounts = [
      createVaultChainAccount('1', { walletId: 1, derivationPath: '//dot/1' }),
      createVaultChainAccount('2', { walletId: 1, derivationPath: '//dot/2' }),

      createVaultChainAccount('4', { walletId: 5000, derivationPath: '//dot/3' }),
      createVaultChainAccount('5', { walletId: 5000, derivationPath: '//dot/4' }),
    ];

    await migrateMultishardAccounts(transactionMock);

    expect(db.wallets).toEqual(newWallets);
    expect(db.accounts2).toEqual(newAccounts);
  });

  it('should skip non-MultiShard wallets', async () => {
    db.wallets = [createSingleShardWallet(1, { rootAccountId: BASE_ACCOUNT_1 })];
    db.accounts2 = [createVaultBaseAccount('1', { walletId: 1 })];

    const newWallets = [...db.wallets];
    const newAccounts = [...db.accounts2];

    await migrateMultishardAccounts(transactionMock);

    expect(db.wallets).toEqual(newWallets);
    expect(db.accounts2).toEqual(newAccounts);
  });
});
