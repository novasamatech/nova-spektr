import { Dexie } from 'dexie';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AccountNameType, AccountType, CryptoType, SigningType, WalletType } from '@/shared/core';
import { toAddress, toShortAddress } from '@/shared/lib/utils';
import { createAccountId } from '@/shared/mocks';

const DB_NAME = 'spektr';
// Last schema version before the two name-type repairs (53 and 54).
const PRE_REPAIR_VERSION = 52;

const syncedMultisigId = createAccountId('synced multisig');
const renamedMultisigId = createAccountId('renamed multisig');
const shortOwnAddress = toShortAddress(toAddress(syncedMultisigId), 5);

const multisigWallet = {
  id: 7,
  name: shortOwnAddress,
  type: WalletType.MULTISIG,
  signingType: SigningType.MULTISIG,
  isActive: false,
};

const createMultisigAccount = (id: string, accountId: string, name: string, nameType: AccountNameType) => ({
  id,
  walletId: multisigWallet.id,
  accountId,
  type: 'universal',
  accountType: AccountType.MULTISIG,
  signingType: SigningType.MULTISIG,
  cryptoType: CryptoType.SR25519,
  threshold: 2,
  signatories: [],
  name,
  nameType,
});

// Migration 14 stamped CUSTOM onto every account, including the synced one named by its own short address.
const syncedAccount = createMultisigAccount('ms-synced', syncedMultisigId, shortOwnAddress, AccountNameType.CUSTOM);
const renamedAccount = createMultisigAccount('ms-renamed', renamedMultisigId, 'Team treasury', AccountNameType.CUSTOM);

const importStorage = () => import('./dexie');
type Storage = Awaited<ReturnType<typeof importStorage>>;

let storage: Storage | null = null;

// The module creates its Dexie instance at load, so every test gets a fresh module over a fresh database.
const loadStorage = async (): Promise<Storage> => {
  vi.resetModules();
  storage = await importStorage();

  return storage;
};

const readAccounts = (store: Storage) => store.dexieStorage.accounts2.toArray();

describe('spektr database', () => {
  afterEach(async () => {
    await storage?.deleteDb();
    storage = null;
    await Dexie.delete(DB_NAME);
  });

  it('SP-01: upgrading a pre-repair profile resets the short-address name of a synced multisig to GENERATED', async () => {
    const legacy = new Dexie(DB_NAME);
    legacy.version(PRE_REPAIR_VERSION).stores({ wallets: '++id', accounts2: 'id' });
    await legacy.table('wallets').put(multisigWallet);
    await legacy.table('accounts2').bulkPut([syncedAccount, renamedAccount]);
    legacy.close();

    const current = await loadStorage();
    const accounts = await readAccounts(current);

    expect(current.dexieStorage.accounts2.db.verno).toBeGreaterThan(PRE_REPAIR_VERSION);
    expect(accounts).toEqual(
      expect.arrayContaining([
        { ...syncedAccount, nameType: AccountNameType.GENERATED },
        // A name the user typed stays CUSTOM.
        renamedAccount,
      ]),
    );
    expect(accounts).toHaveLength(2);
  });

  it('SP-03: importing a pre-repair export resets the short-address name to GENERATED without duplicating the wallet', async () => {
    const exportedDatabase = {
      formatName: 'dexie',
      formatVersion: 1,
      data: {
        databaseName: DB_NAME,
        databaseVersion: PRE_REPAIR_VERSION,
        tables: [
          { name: 'wallets', schema: '++id', rowCount: 1 },
          { name: 'accounts2', schema: 'id', rowCount: 2 },
        ],
        data: [
          { tableName: 'wallets', inbound: true, rows: [multisigWallet] },
          { tableName: 'accounts2', inbound: true, rows: [syncedAccount, renamedAccount] },
        ],
      },
    };

    const current = await loadStorage();
    await current.importDb(new Blob([JSON.stringify(exportedDatabase)], { type: 'application/json' }));

    const accounts = await readAccounts(current);
    const wallets = await current.dexieStorage.wallets.toArray();

    // `importDb` also backfills `createdAt`, hence the partial match.
    expect(accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ...syncedAccount, nameType: AccountNameType.GENERATED }),
        expect.objectContaining(renamedAccount),
      ]),
    );
    expect(accounts).toHaveLength(2);
    expect(wallets.filter((wallet) => wallet.id === multisigWallet.id)).toHaveLength(1);
    expect(wallets).toHaveLength(1);
  });
});
