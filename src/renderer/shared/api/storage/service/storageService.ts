import { IndexableType, Table } from 'dexie';

import { dexieStorage } from './dexie';
import type { NoID } from '@renderer/shared/core';

// TODO: think about throwing errors instead of returning value from catch
class StorageService<T extends { id: K }, K extends IndexableType> {
  private dexieTable: Table<T, K>;

  constructor(table: Table<T, K>) {
    this.dexieTable = table;
  }

  async create(item: NoID<T, K>): Promise<K | undefined> {
    try {
      return this.dexieTable.add(item as T);
    } catch (error) {
      console.log('Error creating object - ', error);

      return undefined;
    }
  }

  async createBulk(items: NoID<T, K>[]): Promise<K[] | undefined> {
    try {
      return this.dexieTable.bulkAdd(items as T[], { allKeys: true });
    } catch (error) {
      console.log('Error creating object - ', error);

      return undefined;
    }
  }

  read(id: K): Promise<T | undefined> {
    try {
      return this.dexieTable.get(id);
    } catch (error) {
      console.log('Error reading object - ', error);

      return Promise.resolve(undefined);
    }
  }

  readBulk(): Promise<T[]> {
    try {
      return this.dexieTable.toArray();
    } catch (error) {
      console.log('Error reading collection - ', error);

      return Promise.resolve([]);
    }
  }

  async update(id: K, item: Partial<NoID<T, K>>): Promise<K | undefined> {
    try {
      const isUpdated = await this.dexieTable.update(id, item);

      return isUpdated ? id : undefined;
    } catch (error) {
      console.log('Error updating object - ', error);

      return Promise.resolve(undefined);
    }
  }

  delete(id: K): Promise<void> {
    return this.dexieTable.delete(id);
  }
}

export const storageService = {
  wallets: new StorageService(dexieStorage.wallets),
  accounts: new StorageService(dexieStorage.accounts),
  contacts: new StorageService(dexieStorage.contacts),
};
