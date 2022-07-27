import Dexie, { Table } from 'dexie';

import { Connection, IStorage, Test } from './types';

export class Storage extends Dexie implements IStorage {
  test!: Table<Test>;
  connections!: Table<Connection>;

  constructor() {
    super('omni'); // TODO: naming is not final
    this.version(1).stores({
      test: '++id',
      connections: '++id,chainId,type',
    });
  }

  getTestById(id: string): Promise<Test | undefined> {
    return db.test.get(id);
  }
}

export const db = new Storage();
