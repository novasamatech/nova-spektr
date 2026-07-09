import { type Transaction } from 'dexie';
import { beforeEach } from 'vitest';

import { resetVaultAccountNameType } from '@/shared/api/storage/migration';
import { AccountNameType, AccountType, SigningType, WalletType } from '@/shared/core';

describe('Migration 21 - Reset Polkadot Vault derived-key nameType from CUSTOM to GENERATED', () => {
  const db = {
    wallets: [] as Record<string, unknown>[],
    accounts2: [] as Record<string, unknown>[],
  };

  const transactionMock = {
    table: vi.fn().mockImplementation((tableName: 'wallets' | 'accounts2') => {
      return {
        toArray: vi.fn(() => Promise.resolve(db[tableName])),
        toCollection: vi.fn(() => ({
          // Mirrors real Dexie semantics (dexie.js Collection.modify): the callback
          // receives a clone, and the record is only written back if the callback
          // returns anything other than `false` — a bare `return;` (undefined) still
          // writes back.
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

  beforeEach(() => {
    db.wallets = [];
    db.accounts2 = [];
  });

  it('should reset a CUSTOM-named Vault chain account to GENERATED', async () => {
    db.wallets = [{ id: 1, type: WalletType.POLKADOT_VAULT }];
    db.accounts2 = [
      {
        id: 1,
        walletId: 1,
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
        walletId: 1,
        signingType: SigningType.POLKADOT_VAULT,
        accountType: AccountType.CHAIN,
        name: 'Main',
        nameType: AccountNameType.GENERATED,
      },
    ]);
  });

  it('should reset a CUSTOM-named Vault shard account to GENERATED', async () => {
    db.wallets = [{ id: 1, type: WalletType.POLKADOT_VAULT }];
    db.accounts2 = [
      {
        id: 1,
        walletId: 1,
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
        walletId: 1,
        signingType: SigningType.POLKADOT_VAULT,
        accountType: AccountType.SHARD,
        name: '//polkadot//0',
        nameType: AccountNameType.GENERATED,
      },
    ]);
  });

  it('should reset a legacy account carrying a stale signingType from a pre-accounts2 Multishard migration', async () => {
    // migration-2 stamped `wallet.signingType = PARITY_SIGNER` for old Multishard
    // wallets, migration-3 copied it onto every account, and migration-6 regrouped
    // these accounts into today's Vault wallet without ever rewriting signingType.
    db.wallets = [{ id: 1, type: WalletType.POLKADOT_VAULT }];
    db.accounts2 = [
      {
        id: 1,
        walletId: 1,
        signingType: SigningType.PARITY_SIGNER,
        accountType: AccountType.CHAIN,
        name: '//polkadot//0',
        nameType: AccountNameType.CUSTOM,
      },
    ];

    await resetVaultAccountNameType(transactionMock);

    expect(db.accounts2).toEqual([
      {
        id: 1,
        walletId: 1,
        signingType: SigningType.PARITY_SIGNER,
        accountType: AccountType.CHAIN,
        name: '//polkadot//0',
        nameType: AccountNameType.GENERATED,
      },
    ]);
  });

  it('should reset a CUSTOM-named account under a SingleShard (single Parity Signer) wallet', async () => {
    db.wallets = [{ id: 1, type: WalletType.SINGLE_PARITY_SIGNER }];
    db.accounts2 = [
      {
        id: 1,
        walletId: 1,
        signingType: SigningType.PARITY_SIGNER,
        accountType: AccountType.CHAIN,
        name: '//polkadot',
        nameType: AccountNameType.CUSTOM,
      },
    ];

    await resetVaultAccountNameType(transactionMock);

    expect(db.accounts2).toEqual([
      {
        id: 1,
        walletId: 1,
        signingType: SigningType.PARITY_SIGNER,
        accountType: AccountType.CHAIN,
        name: '//polkadot',
        nameType: AccountNameType.GENERATED,
      },
    ]);
  });

  it('should leave an already-GENERATED Vault chain account untouched and not write it back', async () => {
    const original = {
      id: 1,
      walletId: 1,
      signingType: SigningType.POLKADOT_VAULT,
      accountType: AccountType.CHAIN,
      name: '//polkadot//0',
      nameType: AccountNameType.GENERATED,
    };
    db.wallets = [{ id: 1, type: WalletType.POLKADOT_VAULT }];
    db.accounts2 = [original];

    await resetVaultAccountNameType(transactionMock);

    expect(db.accounts2[0]).toBe(original);
  });

  it('should not touch a CUSTOM-named Vault BASE account (zero-derivation fallback, name is user-typed) and not write it back', async () => {
    const original = {
      id: 1,
      walletId: 1,
      signingType: SigningType.POLKADOT_VAULT,
      accountType: AccountType.BASE,
      type: 'universal',
      name: 'My wallet',
      nameType: AccountNameType.CUSTOM,
    };
    db.wallets = [{ id: 1, type: WalletType.POLKADOT_VAULT }];
    db.accounts2 = [original];

    await resetVaultAccountNameType(transactionMock);

    expect(db.accounts2[0]).toBe(original);
  });

  it('should not touch CUSTOM-named accounts under a non-Vault wallet and not write them back', async () => {
    const original = {
      id: 1,
      walletId: 1,
      signingType: SigningType.MULTISIG,
      accountType: AccountType.MULTISIG,
      name: 'My multisig',
      nameType: AccountNameType.CUSTOM,
    };
    db.wallets = [{ id: 1, type: WalletType.MULTISIG }];
    db.accounts2 = [original];

    await resetVaultAccountNameType(transactionMock);

    expect(db.accounts2[0]).toBe(original);
  });

  it('should handle empty accounts2 table', async () => {
    db.wallets = [{ id: 1, type: WalletType.POLKADOT_VAULT }];
    db.accounts2 = [];

    await resetVaultAccountNameType(transactionMock);

    expect(db.accounts2).toEqual([]);
  });
});
