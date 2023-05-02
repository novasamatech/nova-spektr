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
} from './common/types';
import { useBalanceStorage } from './balanceStorage';
import { useConnectionStorage } from './connectionStorage';
import { useWalletStorage } from './walletStorage';
import { useAccountStorage } from './accountStorage';
import { useContactStorage } from './contactStorage';
import { useTransactionStorage } from './transactionStorage';
import { useNotificationStorage } from './notificationStorage';

class DexieStorage extends Dexie {
  connections: TConnection;
  balances: TBalance;
  wallets: TWallet;
  accounts: TAccount;
  contacts: TContact;
  multisigTransactions: TMultisigTransaction;
  notifications: TNotification;

  constructor() {
    super('spektr');
    this.version(15).stores({
      connections: '++id,chainId,type',
      wallets: '++id,isActive,type',
      balances: '[accountId+chainId+assetId],[accountId+chainId]',
      accounts: '++id,isActive,walletId,rootId,signingType',
      contacts: '++id,name,accountId,matrixId',
      multisigTransactions:
        '++id,[accountId+status],[accountId+callHash],[callHash+status+chainId],[accountId+chainId+callHash+blockCreated+indexCreated],accountId,status,callHash',
      notifications: '++id,type,read',
    });

    this.connections = this.table('connections');
    this.balances = this.table('balances');
    this.wallets = this.table('wallets');
    this.accounts = this.table('accounts');
    this.contacts = this.table('contacts');
    this.multisigTransactions = this.table('multisigTransactions');
    this.notifications = this.table('notifications');
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
      case 'notifications':
        return useNotificationStorage(this.dexieDB.notifications) as DataStorage[T];
      default:
        return undefined;
    }
  }
}

export const storage = new StorageFactory();
