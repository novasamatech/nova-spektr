import { default as Dexie } from 'dexie';
import { exportDB, importInto } from 'dexie-export-import';

import {
  type TAccount2,
  type TAccount,
  type TBalance,
  type TBasketTransaction,
  type TConnection,
  type TContact,
  type TMetadata,
  type TMultisigOperations,
  type TNotification,
  type TProxy,
  type TWallet,
} from '../lib/types';
import {
  addAccountNameType,
  migrateAccounts,
  migrateBasketTransactionAfterAddressRemoval,
  migrateCASBasket,
  migrateDuplicateVaultDerivations,
  migrateEVMAccountsCryptoType,
  migrateEvents,
  migrateMultishardAccounts,
  migrateMultisigAccounts,
  migrateNotificationStructure,
  migratePVAccounts,
  migrateRevoteToVote,
  migrateWallets,
  removeDeprecatedProxiedAccounts,
  renameBlockNumberToEntropyBlockNumber,
} from '../migration';

class DexieStorage extends Dexie {
  connections: TConnection;
  balances2: TBalance;
  wallets: TWallet;
  /**
   * @deprecated For now it's replaced by accounts2 table, but not wiped for
   *   backup.
   */
  accounts: TAccount;
  accounts2: TAccount2;
  contacts: TContact;
  multisigOperations: TMultisigOperations;
  notifications: TNotification;
  metadata: TMetadata;
  proxies: TProxy;
  basketTransactions: TBasketTransaction;

  constructor() {
    super('spektr');

    this.version(16).stores({
      connections: '++id,chainId,type',
      wallets: '++id,isActive,type',
      balances: '[accountId+chainId+assetId],[accountId+chainId]',
      accounts: '++id,isActive,walletId,rootId,signingType',
      contacts: '++id,name,accountId,matrixId',
      multisigTransactions:
        '[accountId+chainId+callHash+blockCreated+indexCreated],[accountId+status],[accountId+callHash],[callHash+status+chainId],accountId,status,callHash',
      notifications: '++id,type,read',
    });

    this.version(17)
      .stores({
        multisigEvents: '++id,[txAccountId+txChainId+txCallHash+txBlock+txIndex],status,accountId',
      })
      .upgrade(migrateEvents);

    this.version(19)
      .stores({
        wallets: '++id',
        contacts: '++id',
        accounts: '++id',
        metadata: '[chainId+version],chainId',
      })
      .upgrade(migrateWallets);

    this.version(21).stores({
      proxies: '++id',
      connections: '++id',
      notifications: '++id',
      metadata: null,
    });

    this.version(22).stores({
      metadata: '++id',
    });

    this.version(23).stores({
      basketTransactions: '++id',
    });

    this.version(24).stores({
      metadata: null,
    });

    this.version(25).stores({
      metadata: '++id',
    });

    this.version(26)
      .stores({
        accounts2: 'id',
      })
      .upgrade(migrateAccounts);

    this.version(27)
      .stores({
        accounts2: 'id',
        wallets: '++id',
      })
      .upgrade(migrateMultisigAccounts);

    this.version(28).upgrade(migratePVAccounts);
    this.version(29).upgrade(migrateMultishardAccounts);

    this.version(30).stores({
      multisigOperations: 'id',
    });

    this.version(31).upgrade(migrateCASBasket);

    this.version(32).upgrade(migrateEVMAccountsCryptoType);

    this.version(33).upgrade((t) => t.table('balances').clear());

    this.version(34).upgrade(removeDeprecatedProxiedAccounts);

    this.version(35).upgrade((t) => t.table('balances').clear());

    this.version(36).upgrade(migrateRevoteToVote);

    // fixing transaction in basket and multisig operations
    this.version(37)
      .upgrade(migrateBasketTransactionAfterAddressRemoval)
      .upgrade((t) => t.table('multisigOperations').clear());

    this.version(38).upgrade(migrateDuplicateVaultDerivations);

    this.version(39)
      .stores({
        balances2: 'id',
      })
      .upgrade((t) => t.table('balances').clear());

    this.version(40).upgrade(renameBlockNumberToEntropyBlockNumber);

    this.version(41).upgrade(addAccountNameType);

    this.version(42).upgrade(migrateNotificationStructure);

    this.connections = this.table('connections');
    this.balances2 = this.table('balances2');
    this.wallets = this.table('wallets');
    this.accounts = this.table('accounts');
    this.accounts2 = this.table('accounts2');
    this.contacts = this.table('contacts');
    this.multisigOperations = this.table('multisigOperations');
    this.notifications = this.table('notifications');
    this.metadata = this.table('metadata');
    this.proxies = this.table('proxies');
    this.basketTransactions = this.table('basketTransactions');
  }
}

const dexie = new DexieStorage();

export const exportDb = async () => {
  const blob = await exportDB(dexie, {
    prettyJson: true,
    skipTables: ['metadata', 'balances', 'proxies'],
  });

  return { blob, fileName: 'spektr-database.json' };
};

export const importDb = async (blob: Blob) => {
  await importInto(dexie, blob, { acceptVersionDiff: true });

  await dexie.transaction('rw', dexie.accounts2, dexie.notifications, async (t) => {
    await addAccountNameType(t);
    await migrateNotificationStructure(t);
  });
};

export const deleteDb = async () => {
  await dexie.delete();
  // Also delete effector-storage cache database
  await Dexie.delete('spektr-cache');
};

export const dexieStorage = {
  wallets: dexie.wallets,
  accounts2: dexie.accounts2,
  contacts: dexie.contacts,
  connections: dexie.connections,
  proxies: dexie.proxies,
  notifications: dexie.notifications,
  metadata: dexie.metadata,
  balances2: dexie.balances2,
  basketTransactions: dexie.basketTransactions,
};
