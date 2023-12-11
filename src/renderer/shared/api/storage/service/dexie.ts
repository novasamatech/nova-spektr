import Dexie from 'dexie';

import { useBalanceStorage } from './balanceStorage';
import { useTransactionStorage } from './transactionStorage';
import { useNotificationStorage } from './notificationStorage';
import { useMultisigEventStorage } from './multisigEventStorage';
import { useMetadataStorage } from './metadataStorage';
import { migrateEvents, migrateWallets } from '../migration';
import {
  DataStorage,
  IStorage,
  TWallet,
  TContact,
  TBalance,
  TConnection,
  TAccount,
  TMultisigTransaction,
  TNotification,
  TMultisigEvent,
  TMetadata,
} from '../common/types';

class DexieStorage extends Dexie {
  connections: TConnection;
  balances: TBalance;
  wallets: TWallet;
  accounts: TAccount;
  contacts: TContact;
  multisigTransactions: TMultisigTransaction;
  multisigEvents: TMultisigEvent;
  notifications: TNotification;
  metadata: TMetadata;

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

    this.connections = this.table('connections');
    this.balances = this.table('balances');
    this.wallets = this.table('wallets');
    this.accounts = this.table('accounts');
    this.contacts = this.table('contacts');
    this.multisigTransactions = this.table('multisigTransactions');
    this.multisigEvents = this.table('multisigEvents');
    this.notifications = this.table('notifications');
    this.metadata = this.table('metadata');
  }
}

class StorageFactory implements IStorage {
  private dexieDB: DexieStorage;

  constructor(dexie: DexieStorage) {
    this.dexieDB = dexie;
  }

  public connectTo<T extends keyof DataStorage>(name: T): DataStorage[T] | undefined {
    switch (name) {
      case 'balances':
        return useBalanceStorage(this.dexieDB.balances) as DataStorage[T];
      case 'multisigTransactions':
        return useTransactionStorage(this.dexieDB.multisigTransactions) as DataStorage[T];
      case 'multisigEvents':
        return useMultisigEventStorage(this.dexieDB.multisigEvents) as DataStorage[T];
      case 'notifications':
        return useNotificationStorage(this.dexieDB.notifications) as DataStorage[T];
      case 'metadata':
        return useMetadataStorage(this.dexieDB.metadata) as DataStorage[T];
      default:
        return undefined;
    }
  }
}

const dexie = new DexieStorage();

export const storage = new StorageFactory(dexie);

export const dexieStorage = {
  wallets: dexie.wallets,
  accounts: dexie.accounts,
  contacts: dexie.contacts,
  connections: dexie.connections,
};
