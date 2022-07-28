import Dexie, { Table } from 'dexie';

import { Connection, IStorage } from './types';

export class Storage extends Dexie implements IStorage {
  connections!: Table<Connection>;

  constructor() {
    super('omni'); // TODO: naming is not final
    this.version(1).stores({
      connections: '++id,chainId,type',
    });
  }
}

export const db = new Storage();
