import { type Transaction } from 'dexie';
import { beforeEach } from 'vitest';

import { resetVaultAccountNameType } from '@/shared/api/storage/migration';
import { AccountNameType, AccountType, SigningType } from '@/shared/core';

describe('Migration 21 - Reset Polkadot Vault derived-key nameType from CUSTOM to GENERATED', () => {
  const db = {
    accounts2: [] as Record<string, unknown>[],
  };

  const transactionMock = {
    table: vi.fn().mockImplementation((tableName: 'accounts2') => {
      return {
        toCollection: vi.fn(() => ({
          modify: vi.fn((fn: (record: Record<string, unknown>) => void) => {
            for (const record of db[tableName]) {
              fn(record);
            }
          }),
        })),
      };
    }),
  } as unknown as Transaction;

  beforeEach(() => {
    db.accounts2 = [];
  });

  it('should reset a CUSTOM-named Vault chain account to GENERATED', async () => {
    db.accounts2 = [
      {
        id: 1,
        signingType: SigningType.POLKADOT_VAULT,
        accountType: AccountType.CHAIN,
        name: 'Main',
        nameType: AccountNameType.CUSTOM,
      },
    ];

    await resetVaultAccountNameType(transactionMock);

    expect(db.accounts2).toEqual([
      {
        id: 1,
        signingType: SigningType.POLKADOT_VAULT,
        accountType: AccountType.CHAIN,
        name: 'Main',
        nameType: AccountNameType.GENERATED,
      },
    ]);
  });

  it('should reset a CUSTOM-named Vault shard account to GENERATED', async () => {
    db.accounts2 = [
      {
        id: 1,
        signingType: SigningType.POLKADOT_VAULT,
        accountType: AccountType.SHARD,
        name: '//polkadot//0',
        nameType: AccountNameType.CUSTOM,
      },
    ];

    await resetVaultAccountNameType(transactionMock);

    expect(db.accounts2).toEqual([
      {
        id: 1,
        signingType: SigningType.POLKADOT_VAULT,
        accountType: AccountType.SHARD,
        name: '//polkadot//0',
        nameType: AccountNameType.GENERATED,
      },
    ]);
  });

  it('should leave an already-GENERATED Vault chain account untouched', async () => {
    db.accounts2 = [
      {
        id: 1,
        signingType: SigningType.POLKADOT_VAULT,
        accountType: AccountType.CHAIN,
        name: '//polkadot//0',
        nameType: AccountNameType.GENERATED,
      },
    ];

    await resetVaultAccountNameType(transactionMock);

    expect(db.accounts2).toEqual([
      {
        id: 1,
        signingType: SigningType.POLKADOT_VAULT,
        accountType: AccountType.CHAIN,
        name: '//polkadot//0',
        nameType: AccountNameType.GENERATED,
      },
    ]);
  });

  it('should not touch a CUSTOM-named Vault BASE account (zero-derivation fallback, name is user-typed)', async () => {
    db.accounts2 = [
      {
        id: 1,
        signingType: SigningType.POLKADOT_VAULT,
        accountType: AccountType.BASE,
        type: 'universal',
        name: 'My wallet',
        nameType: AccountNameType.CUSTOM,
      },
    ];

    await resetVaultAccountNameType(transactionMock);

    expect(db.accounts2).toEqual([
      {
        id: 1,
        signingType: SigningType.POLKADOT_VAULT,
        accountType: AccountType.BASE,
        type: 'universal',
        name: 'My wallet',
        nameType: AccountNameType.CUSTOM,
      },
    ]);
  });

  it('should not touch CUSTOM-named non-Vault accounts', async () => {
    db.accounts2 = [
      {
        id: 1,
        signingType: SigningType.MULTISIG,
        accountType: AccountType.MULTISIG,
        name: 'My multisig',
        nameType: AccountNameType.CUSTOM,
      },
    ];

    await resetVaultAccountNameType(transactionMock);

    expect(db.accounts2).toEqual([
      {
        id: 1,
        signingType: SigningType.MULTISIG,
        accountType: AccountType.MULTISIG,
        name: 'My multisig',
        nameType: AccountNameType.CUSTOM,
      },
    ]);
  });

  it('should handle empty accounts2 table', async () => {
    db.accounts2 = [];

    await resetVaultAccountNameType(transactionMock);

    expect(db.accounts2).toEqual([]);
  });
});
