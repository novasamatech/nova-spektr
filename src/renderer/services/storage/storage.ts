import Dexie, { Table } from 'dexie';

import {
  BalanceDS,
  WalletDS,
  ConnectionDS,
  DataStorage,
  IStorage,
  MultisigTransactionDS,
  AccountDS,
  ContactDS,
} from './common/types';
import { useBalanceStorage } from './balanceStorage';
import { useConnectionStorage } from './connectionStorage';
import { useWalletStorage } from './walletStorage';
import { useAccountStorage } from './accountStorage';
import { useContactStorage } from './contactStorage';
import { useTransactionStorage } from './transactionStorage';

class DexieStorage extends Dexie {
  connections: Table<ConnectionDS>;
  balances: Table<BalanceDS>;
  wallets: Table<WalletDS>;
  accounts: Table<AccountDS>;
  contacts: Table<ContactDS>;
  multisigTransactions: Table<MultisigTransactionDS>;

  constructor() {
    super('omni'); // TODO: naming is not final
    this.version(12).stores({
      connections: '++id,chainId,type',
      balances: '[publicKey+chainId+assetId],[publicKey+chainId]',
      wallets: '++id,isActive,type',
      accounts: '++id,isActive,walletId,rootId,signingType',
      contacts: '++id,name,accountId,matrixId',
      multisigTransactions:
        '++id,[publicKey+status],[publicKey+callHash],[callHash+status+chainId],publicKey,status,callHash',
    });

    this.connections = this.table('connections');
    this.balances = this.table('balances');
    this.wallets = this.table('wallets');
    this.accounts = this.table('accounts');
    this.contacts = this.table('contacts');
    this.multisigTransactions = this.table('multisigTransactions');
  }
}

class StorageFactory implements IStorage {
  private dexieDB: DexieStorage;

  constructor() {
    this.dexieDB = new DexieStorage();
  }

  public connectTo<T extends keyof DataStorage>(name: T): DataStorage[T] | undefined {
    switch (name) {
      case 'balances':
        return useBalanceStorage(this.dexieDB.balances) as DataStorage[T];
      case 'connections':
        return useConnectionStorage(this.dexieDB.connections) as DataStorage[T];
      case 'wallets':
        return useWalletStorage(this.dexieDB.wallets) as DataStorage[T];
      case 'accounts':
        return useAccountStorage(this.dexieDB.accounts) as DataStorage[T];
      case 'contacts':
        return useContactStorage(this.dexieDB.contacts) as DataStorage[T];
      case 'multisigTransactions':
        return useTransactionStorage(this.dexieDB.multisigTransactions) as DataStorage[T];
      default:
        return undefined;
    }
  }
}

export const storage = new StorageFactory();
