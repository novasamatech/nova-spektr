import { type Transaction } from 'dexie';
import { beforeEach } from 'vitest';

import { migrateWalletsHiddenReason } from '@/shared/api/storage/migration';

describe('Migration 20 - Replace wallet isHidden flag with hiddenReason', () => {
  const db = {
    wallets: [] as Record<string, unknown>[],
  };

  const transactionMock = {
    table: vi.fn().mockImplementation((tableName: 'wallets') => {
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
    db.wallets = [];
  });

  it('should mark explicitly hidden wallets as manual', async () => {
    db.wallets = [{ id: 1, name: 'Hidden', isHidden: true }];

    await migrateWalletsHiddenReason(transactionMock);

    expect(db.wallets).toEqual([{ id: 1, name: 'Hidden', hiddenReason: 'manual' }]);
  });

  it('should drop the isHidden flag from visible wallets without adding a reason', async () => {
    db.wallets = [{ id: 1, name: 'Visible', isHidden: false }];

    await migrateWalletsHiddenReason(transactionMock);

    expect(db.wallets).toEqual([{ id: 1, name: 'Visible' }]);
  });

  it('should leave wallets without the isHidden flag untouched', async () => {
    db.wallets = [{ id: 1, name: 'Untouched' }];

    await migrateWalletsHiddenReason(transactionMock);

    expect(db.wallets).toEqual([{ id: 1, name: 'Untouched' }]);
  });

  it('should handle empty wallets table', async () => {
    db.wallets = [];

    await migrateWalletsHiddenReason(transactionMock);

    expect(db.wallets).toEqual([]);
  });
});
