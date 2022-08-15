import Dexie, { Table } from 'dexie';

import { Balance, Connection, IStorage } from './common/types';

export class Storage extends Dexie implements IStorage {
  connections!: Table<Connection>;
  balances!: Table<Balance>;

  constructor() {
    super('omni'); // TODO: naming is not final
    this.version(2).stores({
      connections: '++id,chainId,type',
      balances: '[publicKey+chainId+assetId]',
    });
  }
}

export const db = new Storage();
