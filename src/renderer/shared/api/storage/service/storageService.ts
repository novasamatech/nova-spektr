import { IndexableType, Table } from 'dexie';

import { dexieStorage } from './dexie';
import type { NoID } from '@renderer/shared/core';

// TODO: think about throwing errors instead of returning value from catch
class StorageService<T extends { id: K }, K extends IndexableType> {
  private dexieTable: Table<T, K>;

  constructor(table: Table<T, K>) {
    this.dexieTable = table;
  }

  async create(item: NoID<T, K>): Promise<T | undefined> {
    try {
      const id = await this.dexieTable.add(item as T);
      if (!id) return undefined;

      return { id, ...item } as T;
    } catch (error) {
      console.log('Error creating object - ', error);

      return undefined;
    }
  }

  async createAll(items: NoID<T, K>[]): Promise<T[] | undefined> {
    try {
      const ids = await this.dexieTable.bulkAdd(items as T[], { allKeys: true });
      if (!ids) return undefined;

      return items.map((item, index) => ({ id: ids[index], ...item })) as T[];
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

  readAll(): Promise<T[]> {
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

  async updateAll(items: Array<Partial<T> & { id: K }>): Promise<number[] | undefined> {
    try {
      const updates = items.map((item) => {
        return this.dexieTable.update(item.id, item);
      });

      return Promise.all(updates);
    } catch (error) {
      console.log('Error updating object - ', error);

      return Promise.resolve(undefined);
    }
  }

  delete(id: K): Promise<void> {
    return this.dexieTable.delete(id);
  }

  deleteAll(ids: K[]): Promise<void> {
    return this.dexieTable.bulkDelete(ids);
  }
}

export const storageService = {
  wallets: new StorageService(dexieStorage.wallets),
  accounts: new StorageService(dexieStorage.accounts),
  contacts: new StorageService(dexieStorage.contacts),
};
