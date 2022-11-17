import Dexie, { Table } from 'dexie';

import { BalanceDS, WalletDS, ConnectionDS, DataStorage, IStorage, TransactionDS } from './common/types';
import { useBalanceStorage } from './balanceStorage';
import { useConnectionStorage } from './connectionStorage';
import { useWalletStorage } from './walletStorage';

class DexieStorage extends Dexie {
  connections: Table<ConnectionDS>;
  balances: Table<BalanceDS>;
  wallets: Table<WalletDS>;
  transactions: Table<TransactionDS>;

  constructor() {
    super('omni'); // TODO: naming is not final
    this.version(4).stores({
      connections: '++id,chainId,type',
      balances: '[publicKey+chainId+assetId],[publicKey+chainId]',
      wallets: '++id,isActive,type',
      transactions: '++id,type',
    });

    this.connections = this.table('connections');
    this.balances = this.table('balances');
    this.wallets = this.table('wallets');
    this.transactions = this.table('transactions');
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
      default:
        return undefined;
    }
  }
}

export const storage = new StorageFactory();
