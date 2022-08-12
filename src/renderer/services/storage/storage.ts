import Dexie, { Table } from 'dexie';

import { BalanceDS, WalletDS, ConnectionDS, DataStorage, IStorage } from './common/types';
import { useBalanceStorage } from './balanceDS';
import { useConnectionStorage } from './connectionDS';
import { useWalletStorage } from './walletDS';

class DexieStorage extends Dexie {
  connections: Table<ConnectionDS>;
  balances: Table<BalanceDS>;
  wallets: Table<WalletDS>;

  constructor() {
    super('omni'); // TODO: naming is not final
    this.version(3).stores({
      connections: '++id,chainId,type',
      balances: '[publicKey+chainId+assetId]',
      wallets: '++id',
    });

    this.connections = this.table('connections');
    this.balances = this.table('balances');
    this.wallets = this.table('wallets');
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
