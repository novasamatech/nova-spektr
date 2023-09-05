import Dexie from 'dexie';

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
} from './common/types';
import { useBalanceStorage } from './balanceStorage';
import { useConnectionStorage } from './connectionStorage';
import { useWalletStorage } from './walletStorage';
import { useAccountStorage } from './accountStorage';
import { useContactStorage } from './contactStorage';
import { useTransactionStorage } from './transactionStorage';
import { useNotificationStorage } from './notificationStorage';
import { useMultisigEventStorage } from './multisigEventStorage';
import { upgradeEvents } from './common/upgrades';
import { useMetadataStorage } from './metadataStorage';

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

    // Move Multisig events from transaction to separate table
    this.version(17)
      .stores({
        connections: '++id,chainId,type',
        wallets: '++id,isActive,type',
        balances: '[accountId+chainId+assetId],[accountId+chainId]',
        accounts: '++id,isActive,walletId,rootId,signingType',
        contacts: '++id,name,accountId,matrixId',
        multisigTransactions:
          '[accountId+chainId+callHash+blockCreated+indexCreated],[accountId+status],[accountId+callHash],[callHash+status+chainId],accountId,status,callHash',
        multisigEvents: '++id,[txAccountId+txChainId+txCallHash+txBlock+txIndex],status,accountId',
        notifications: '++id,type,read',
      })
      .upgrade(upgradeEvents);

    this.version(18).stores({
      metadata: '[chainId+version],chainId',
    });

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

  constructor() {
    this.dexieDB = new DexieStorage();
  }

  public connectTo<T extends keyof DataStorage>(name: T): DataStorage[T] | undefined {
    switch (name) {
      case 'connections':
        return useConnectionStorage(this.dexieDB.connections) as DataStorage[T];
      case 'balances':
        return useBalanceStorage(this.dexieDB.balances) as DataStorage[T];
      case 'wallets':
        return useWalletStorage(this.dexieDB.wallets) as DataStorage[T];
      case 'accounts':
        return useAccountStorage(this.dexieDB.accounts) as DataStorage[T];
      case 'contacts':
        return useContactStorage(this.dexieDB.contacts) as DataStorage[T];
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

export const storage = new StorageFactory();
