import Dexie, { Table } from 'dexie';

import { IStorage, Test } from './types';

export class Storage extends Dexie implements IStorage {
  test!: Table<Test>;

  constructor() {
    super('omni'); // TODO: naming is not final
    this.version(1).stores({
      test: '++id',
    });
  }

  getTestById(id: string): Promise<Test | undefined> {
    return db.test.get(id);
  }
}

export const db = new Storage();
