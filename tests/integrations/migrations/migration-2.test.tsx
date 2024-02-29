import Dexie from 'dexie';

import { migrateWallets } from '../../../src/renderer/shared/api/storage/migration/migration-2';
import { MockDataBuilder } from '../utils';

class MyDatabase extends Dexie {
  accounts: Dexie.Table;
  wallets: Dexie.Table;
  multisigEvents: Dexie.Table;

  constructor(databaseName: string) {
    super(databaseName);
    this.version(17).stores({
      accounts: '++id',
      wallets: '++id',
      multisigEvents: '++id',
    });
    this.accounts = this.table('accounts');
    this.wallets = this.table('wallets');
    this.multisigEvents = this.table('multisigEvents');
  }
}

async function pushDataToDB(db: MyDatabase, table: Dexie.Table<any, any>, pushData: any[]) {
  await db.transaction('rw', table, async () => {
    await table.bulkPut(pushData);
  });
}

async function getAndAssertFromTable(
  db: MyDatabase,
  expectedLength: number,
  table: Dexie.Table<any>,
): Promise<Array<any>> {
  const tableRows = await table.toArray();
  expect(tableRows).toHaveLength(expectedLength);

  return tableRows;
}

/**
 * Storage integration tests
 *
 * @group integration
 * @group migrations
 */

describe('migrateWallets from 17 to 18', () => {
  let db: MyDatabase;
  let mockDataBuilder: MockDataBuilder;

  beforeEach(async () => {
    db = new MyDatabase('spektr');
    mockDataBuilder = new MockDataBuilder();
  });

  afterEach(async () => {
    await db.delete();
    db.close();
  });

  test('multishard with one root and one shard migrate correctly', async () => {
    const { wallet, root, shard } = mockDataBuilder.buildMultishardWallet();
    await pushDataToDB(db, db.accounts, [root, shard]);
    await pushDataToDB(db, db.wallets, [wallet]);

    await db.transaction('rw', ['accounts', 'wallets'], migrateWallets);

    const dbWallets = await getAndAssertFromTable(db, 1, db.table('wallets'));
    const dbAccounts = await getAndAssertFromTable(db, 2, db.table('accounts'));

    dbWallets.forEach((wallet) => {
      expect(wallet).toMatchObject({
        type: 'wallet_mps',
        signingType: 'signing_ps',
      });
    });

    const rootAccount = dbAccounts.find((account) => account.type === 'base');
    const shardAccount = dbAccounts.find((account) => account.type === 'chain');

    expect(rootAccount).toMatchObject({
      walletId: dbWallets[0].id,
      accountId: root.accountId,
    });

    expect(shardAccount).toMatchObject({
      walletId: dbWallets[0].id,
      accountId: shard.accountId,
      baseId: rootAccount.id,
    });
  });

  test('multisig migrate correctly', async () => {
    const { signatoryAccount, multisigAccount } = mockDataBuilder.buildMultisigWallet(3, 3);
    await pushDataToDB(db, db.accounts, [signatoryAccount, multisigAccount]);

    await db.transaction('rw', ['accounts', 'wallets'], migrateWallets);

    const dbWallets = await getAndAssertFromTable(db, 2, db.table('wallets'));
    const dbAccounts = await getAndAssertFromTable(db, 2, db.table('accounts'));

    const multisigWalletBD = dbWallets.find((wallet) => wallet.type === 'wallet_ms');
    const vaultWalletBD = dbWallets.find((account) => account.type === 'wallet_sps');

    const vaultAccountBD = dbAccounts.find((account) => account.type === 'base');
    const multisigAccountBD = dbAccounts.find((account) => account.type === 'multisig');

    expect(vaultAccountBD).toMatchObject({
      walletId: vaultWalletBD.id,
      name: vaultWalletBD.name,
    });

    expect(multisigAccountBD).toMatchObject({
      walletId: multisigWalletBD.id,
      name: multisigWalletBD.name,
    });

    expect(multisigWalletBD).toMatchObject({ signingType: 'signing_ms' });
    expect(vaultWalletBD).toMatchObject({ signingType: 'signing_ps' });
  });

  test('polkadot vault migrate correctly', async () => {
    const vaultAccount = mockDataBuilder.buildAccount(true, false, 'signing_ps');
    await pushDataToDB(db, db.accounts, [vaultAccount]);

    await db.transaction('rw', ['accounts', 'wallets'], migrateWallets);
    const dbWallets = await getAndAssertFromTable(db, 1, db.table('wallets'));
    const dbAccounts = await getAndAssertFromTable(db, 1, db.table('accounts'));

    const vaultWalletBD = dbWallets.find((account) => account.type === 'wallet_sps');

    const vaultAccountBD = dbAccounts.find((account) => account.type === 'base');

    expect(vaultAccountBD).toMatchObject({
      walletId: vaultWalletBD.id,
      name: vaultWalletBD.name,
    });

    expect(vaultWalletBD).toMatchObject({ signingType: 'signing_ps' });
  });

  test('watch only wallet migrate correctly', async () => {
    const watchOnlyAccount = mockDataBuilder.buildAccount(true, false, 'signing_wo');
    await pushDataToDB(db, db.accounts, [watchOnlyAccount]);

    await db.transaction('rw', ['accounts', 'wallets'], migrateWallets);
    const dbWallets = await getAndAssertFromTable(db, 1, db.table('wallets'));
    const dbAccounts = await getAndAssertFromTable(db, 1, db.table('accounts'));

    const watchOnlyWalletBD = dbWallets.find((account) => account.type === 'wallet_wo');

    const watchOnlyAccountBD = dbAccounts.find((account) => account.type === 'base');

    expect(watchOnlyAccountBD).toMatchObject({
      walletId: watchOnlyWalletBD.id,
      name: watchOnlyWalletBD.name,
    });

    expect(watchOnlyWalletBD).toMatchObject({ signingType: 'signing_wo' });
    expect(watchOnlyWalletBD.isActive).toEqual(true);
  });
});
