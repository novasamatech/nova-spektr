import { type Transaction } from 'dexie';

import { migrateMultisigAccountNameType } from '@/shared/api/storage/migration';
import { AccountNameType, AccountType } from '@/shared/core';

type RawAccount = { id: string; nameType?: AccountNameType; accountType?: AccountType; [key: string]: unknown };

describe('Migration 19 - Backfill nameType: CUSTOM for multisig accounts', () => {
  const db = {
    accounts2: [] as RawAccount[],
  };

  const transactionMock = {
    table: vi.fn().mockImplementation((tableName: 'accounts2') => {
      return {
        toArray: vi.fn(() => db[tableName]),
        bulkPut: vi.fn().mockImplementation((records: RawAccount[]) => {
          const updated = new Map(records.map((r) => [r.id, r]));
          db[tableName] = db[tableName].map((r) => updated.get(r.id) ?? r);
        }),
      };
    }),
  } as unknown as Transaction;

  beforeEach(() => {
    db.accounts2 = [];
  });

  it('should migrate multisig accounts with GENERATED nameType to CUSTOM', async () => {
    db.accounts2 = [
      { id: '1', accountType: AccountType.MULTISIG, nameType: AccountNameType.GENERATED, name: 'MS Wallet' },
      { id: '2', accountType: AccountType.MULTISIG, nameType: AccountNameType.GENERATED, name: 'MS Wallet 2' },
    ];

    await migrateMultisigAccountNameType(transactionMock);

    expect(db.accounts2[0]!.nameType).toBe(AccountNameType.CUSTOM);
    expect(db.accounts2[1]!.nameType).toBe(AccountNameType.CUSTOM);
  });

  it('should migrate flex_multisig accounts with GENERATED nameType to CUSTOM', async () => {
    db.accounts2 = [
      { id: '1', accountType: AccountType.FLEX_MULTISIG, nameType: AccountNameType.GENERATED, name: 'Flex MS' },
    ];

    await migrateMultisigAccountNameType(transactionMock);

    expect(db.accounts2[0]!.nameType).toBe(AccountNameType.CUSTOM);
  });

  it('should not change non-multisig accounts with GENERATED nameType', async () => {
    db.accounts2 = [
      { id: '1', accountType: AccountType.BASE, nameType: AccountNameType.GENERATED, name: 'Base Account' },
      { id: '2', accountType: AccountType.CHAIN, nameType: AccountNameType.GENERATED, name: 'Chain Account' },
    ];

    await migrateMultisigAccountNameType(transactionMock);

    expect(db.accounts2[0]!.nameType).toBe(AccountNameType.GENERATED);
    expect(db.accounts2[1]!.nameType).toBe(AccountNameType.GENERATED);
  });

  it('should not change multisig accounts already with CUSTOM nameType', async () => {
    db.accounts2 = [
      { id: '1', accountType: AccountType.MULTISIG, nameType: AccountNameType.CUSTOM, name: 'Already Custom' },
    ];

    await migrateMultisigAccountNameType(transactionMock);

    expect(db.accounts2[0]!.nameType).toBe(AccountNameType.CUSTOM);
  });

  it('should handle empty accounts array', async () => {
    db.accounts2 = [];
    await migrateMultisigAccountNameType(transactionMock);
    expect(db.accounts2).toEqual([]);
  });
});
