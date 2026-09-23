import { type Transaction } from 'dexie';
import { beforeEach } from 'vitest';

import { resetGeneratedAccountNameType } from '@/shared/api/storage/migration';
import { AccountNameType, AccountType, SigningType } from '@/shared/core';
import { toAddress, toShortAddress } from '@/shared/lib/utils';
import { createAccountId } from '@/shared/mocks';

describe('Migration 22 - Reset app-generated account names stamped CUSTOM back to GENERATED', () => {
  const accountId = createAccountId('multisig');
  const shortOwn = (chunk: number, prefix?: number) => toShortAddress(toAddress(accountId, { prefix }), chunk);

  const db = {
    accounts2: [] as Record<string, unknown>[],
  };

  const transactionMock = {
    table: vi.fn().mockImplementation((tableName: 'accounts2') => {
      return {
        toCollection: vi.fn(() => ({
          // Mirrors real Dexie semantics (dexie.js Collection.modify): the callback
          // receives a clone, and the record is only written back if the callback
          // returns anything other than `false`.
          modify: vi.fn((fn: (record: Record<string, unknown>) => boolean | void) => {
            db[tableName] = db[tableName].map((record) => {
              const clone = { ...record };
              const result = fn(clone);
              return result === false ? record : clone;
            });
          }),
        })),
      };
    }),
  } as unknown as Transaction;

  const createAccount = (name: string, nameType: AccountNameType) => ({
    id: 1,
    walletId: 1,
    accountId,
    signingType: SigningType.MULTISIG,
    accountType: AccountType.MULTISIG,
    name,
    nameType,
  });

  beforeEach(() => {
    db.accounts2 = [];
  });

  it.each([
    ['shortened own address, default prefix, chunk 5', shortOwn(5)],
    ['shortened own address, generic prefix, chunk 6', shortOwn(6, 42)],
    ['shortened own hex account id', toShortAddress(accountId, 5)],
    ['proxy name over the own address', `Staking for ${shortOwn(6)}`],
    ['pure proxy name over the own hex id', `Any for pure ${toShortAddress(accountId, 5)}`],
  ])('should reset a CUSTOM account named by the app (%s) to GENERATED', async (_, name) => {
    db.accounts2 = [createAccount(name, AccountNameType.CUSTOM)];

    await resetGeneratedAccountNameType(transactionMock);

    expect(db.accounts2).toEqual([createAccount(name, AccountNameType.GENERATED)]);
  });

  it.each([
    ['a user-typed name', 'My multisig'],
    ['a user name shaped like a shortened address', 'Team...Fund'],
    ['a shortening of a different address', toShortAddress(toAddress(createAccountId('someone-else')), 5)],
  ])('should leave a CUSTOM account with %s untouched and not write it back', async (_, name) => {
    const original = createAccount(name, AccountNameType.CUSTOM);
    db.accounts2 = [original];

    await resetGeneratedAccountNameType(transactionMock);

    expect(db.accounts2[0]).toBe(original);
  });

  it('should leave an already-GENERATED account untouched and not write it back', async () => {
    const original = createAccount(shortOwn(5), AccountNameType.GENERATED);
    db.accounts2 = [original];

    await resetGeneratedAccountNameType(transactionMock);

    expect(db.accounts2[0]).toBe(original);
  });

  it('should skip an account without an accountId', async () => {
    const original = { ...createAccount(shortOwn(5), AccountNameType.CUSTOM), accountId: undefined };
    db.accounts2 = [original];

    await resetGeneratedAccountNameType(transactionMock);

    expect(db.accounts2[0]).toBe(original);
  });

  it('should handle empty accounts2 table', async () => {
    await resetGeneratedAccountNameType(transactionMock);

    expect(db.accounts2).toEqual([]);
  });
});
