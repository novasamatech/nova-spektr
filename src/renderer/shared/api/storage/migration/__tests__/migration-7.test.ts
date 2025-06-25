import { type Transaction } from 'dexie';
import { beforeEach, vi } from 'vitest';

import { migrateProxyDuplicates } from '@/shared/api/storage/migration';
import { type ProxyAccount } from '@/shared/core';
import { TEST_ACCOUNTS, merge } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

describe('Migration 7 - Remove duplicate proxy entries', () => {
  const db = {
    proxies: [] as ProxyAccount[],
  };

  const transactionMock = {
    table: vi.fn().mockImplementation((tableName: 'proxies') => {
      return {
        toArray: vi.fn(() => db[tableName]),

        bulkDelete: vi.fn().mockImplementation((ids: number[]) => {
          db[tableName] = db[tableName].filter((record) => !ids.includes(record.id));
        }),

        bulkPut: vi.fn().mockImplementation((items: ProxyAccount[]) => {
          db[tableName] = merge({
            a: db[tableName],
            b: items,
            mergeBy: (i) => i.id,
            merge: (_, b) => b,
          });
        }),
      };
    }),
  } as unknown as Transaction;

  beforeEach(() => {
    db.proxies = [];
  });

  it('should remove duplicate proxy entries', async () => {
    const proxy1: ProxyAccount = {
      id: 1,
      accountId: TEST_ACCOUNTS[0] as AccountId,
      proxiedAccountId: TEST_ACCOUNTS[1] as AccountId,
      chainId: '0x01',
      proxyType: 'Any',
      delay: 0,
    };

    const proxy2: ProxyAccount = {
      id: 2,
      accountId: TEST_ACCOUNTS[0] as AccountId,
      proxiedAccountId: TEST_ACCOUNTS[1] as AccountId,
      chainId: '0x01',
      proxyType: 'Any',
      delay: 0,
    };

    const proxy3: ProxyAccount = {
      id: 3,
      accountId: TEST_ACCOUNTS[2] as AccountId,
      proxiedAccountId: TEST_ACCOUNTS[3] as AccountId,
      chainId: '0x02',
      proxyType: 'Staking',
      delay: 0,
    };

    db.proxies = [proxy1, proxy2, proxy3];

    await migrateProxyDuplicates(transactionMock);

    // Should keep the proxy with the lowest ID (proxy1) and the unique proxy (proxy3)
    expect(db.proxies).toHaveLength(2);
    expect(db.proxies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 1, accountId: TEST_ACCOUNTS[0] }),
        expect.objectContaining({ id: 3, accountId: TEST_ACCOUNTS[2] }),
      ]),
    );

    // Should not contain the duplicate with higher ID
    expect(db.proxies).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: 2 })]));
  });

  it('should handle proxies with different properties correctly', async () => {
    const proxy1: ProxyAccount = {
      id: 1,
      accountId: TEST_ACCOUNTS[0] as AccountId,
      proxiedAccountId: TEST_ACCOUNTS[1] as AccountId,
      chainId: '0x01',
      proxyType: 'Any',
      delay: 0,
    };

    const proxy2: ProxyAccount = {
      id: 2,
      accountId: TEST_ACCOUNTS[0] as AccountId,
      proxiedAccountId: TEST_ACCOUNTS[1] as AccountId,
      chainId: '0x01',
      proxyType: 'Staking', // Different proxyType
      delay: 0,
    };

    const proxy3: ProxyAccount = {
      id: 3,
      accountId: TEST_ACCOUNTS[0] as AccountId,
      proxiedAccountId: TEST_ACCOUNTS[1] as AccountId,
      chainId: '0x02', // Different chainId
      proxyType: 'Any',
      delay: 0,
    };

    db.proxies = [proxy1, proxy2, proxy3];

    await migrateProxyDuplicates(transactionMock);

    // All should remain as they have different properties
    expect(db.proxies).toHaveLength(3);
    expect(db.proxies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 1 }),
        expect.objectContaining({ id: 2 }),
        expect.objectContaining({ id: 3 }),
      ]),
    );
  });

  it('should handle proxies with different delays correctly', async () => {
    const proxy1: ProxyAccount = {
      id: 1,
      accountId: TEST_ACCOUNTS[0] as AccountId,
      proxiedAccountId: TEST_ACCOUNTS[1] as AccountId,
      chainId: '0x01',
      proxyType: 'Any',
      delay: 0,
    };

    const proxy2: ProxyAccount = {
      id: 2,
      accountId: TEST_ACCOUNTS[0] as AccountId,
      proxiedAccountId: TEST_ACCOUNTS[1] as AccountId,
      chainId: '0x01',
      proxyType: 'Any',
      delay: 10, // Different delay
    };

    db.proxies = [proxy1, proxy2];

    await migrateProxyDuplicates(transactionMock);

    // Both should remain as they have different delays
    expect(db.proxies).toHaveLength(2);
    expect(db.proxies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 1, delay: 0 }),
        expect.objectContaining({ id: 2, delay: 10 }),
      ]),
    );
  });

  it('should handle multiple duplicates and keep the oldest entry', async () => {
    const proxy1: ProxyAccount = {
      id: 1,
      accountId: TEST_ACCOUNTS[0] as AccountId,
      proxiedAccountId: TEST_ACCOUNTS[1] as AccountId,
      chainId: '0x01',
      proxyType: 'Any',
      delay: 0,
    };

    const proxy2: ProxyAccount = {
      id: 2,
      accountId: TEST_ACCOUNTS[0] as AccountId,
      proxiedAccountId: TEST_ACCOUNTS[1] as AccountId,
      chainId: '0x01',
      proxyType: 'Any',
      delay: 0,
    };

    const proxy3: ProxyAccount = {
      id: 3,
      accountId: TEST_ACCOUNTS[0] as AccountId,
      proxiedAccountId: TEST_ACCOUNTS[1] as AccountId,
      chainId: '0x01',
      proxyType: 'Any',
      delay: 0,
    };

    const proxy4: ProxyAccount = {
      id: 4,
      accountId: TEST_ACCOUNTS[2] as AccountId,
      proxiedAccountId: TEST_ACCOUNTS[3] as AccountId,
      chainId: '0x02',
      proxyType: 'Staking',
      delay: 0,
    };

    db.proxies = [proxy1, proxy2, proxy3, proxy4];

    await migrateProxyDuplicates(transactionMock);

    // Should keep only the oldest duplicate (proxy1) and the unique proxy (proxy4)
    expect(db.proxies).toHaveLength(2);
    expect(db.proxies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 1, accountId: TEST_ACCOUNTS[0] }),
        expect.objectContaining({ id: 4, accountId: TEST_ACCOUNTS[2] }),
      ]),
    );

    // Should not contain the duplicates with higher IDs
    expect(db.proxies).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: 2 })]));
    expect(db.proxies).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: 3 })]));
  });

  it('should handle empty table', async () => {
    await migrateProxyDuplicates(transactionMock);

    expect(db.proxies).toHaveLength(0);
  });
});
