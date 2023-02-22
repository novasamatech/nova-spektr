import Dexie, { Table } from 'dexie';

import {
  BalanceDS,
  WalletDS,
  ConnectionDS,
  DataStorage,
  IStorage,
  TransactionDS,
  AccountDS,
  ContactDS,
} from './common/types';
import { useBalanceStorage } from './balanceStorage';
import { useConnectionStorage } from './connectionStorage';
import { useWalletStorage } from './walletStorage';
import { useAccountStorage } from './accountStorage';
import { useContactStorage } from './contactStorage';

class DexieStorage extends Dexie {
  connections: Table<ConnectionDS>;
  balances: Table<BalanceDS>;
  wallets: Table<WalletDS>;
  accounts: Table<AccountDS>;
  transactions: Table<TransactionDS>;
  contacts: Table<ContactDS>;

  constructor() {
    super('omni'); // TODO: naming is not final
    this.version(8).stores({
      connections: '++id,chainId,type',
      balances: '[publicKey+chainId+assetId],[publicKey+chainId]',
      wallets: '++id,isActive,type',
      accounts: '++id,isActive,walletId,rootId,signingType',
      transactions: '++id,type',
      contacts: '++id,name,accountId,matrixId',
    });

    this.connections = this.table('connections');
    this.balances = this.table('balances');
    this.wallets = this.table('wallets');
    this.accounts = this.table('accounts');
    this.transactions = this.table('transactions');
    this.contacts = this.table('contacts');
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
      default:
        return undefined;
    }
  }
}

export const storage = new StorageFactory();
