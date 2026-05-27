import { type IndexableType, type Table, type UpdateSpec } from 'dexie';

import { type NoID } from '@/shared/core';

import { dexieStorage } from './dexie';

// TODO: think about throwing errors instead of returning value from catch
export class StorageService<T extends { id: K }, K extends IndexableType> {
  private dexieTable: Table<T, K>;

  constructor(table: Table<T, K>) {
    this.dexieTable = table;
  }

  async create(item: NoID<T>): Promise<T | undefined> {
    try {
      const id = await this.dexieTable.add(item as T);
      if (!id) return undefined;

      return { id, ...item } as T;
    } catch (error) {
      console.log('Error creating object - ', error);

      return undefined;
    }
  }

  async createAll(items: NoID<T>[]): Promise<T[] | undefined> {
    if (items.length === 0) {
      return undefined;
    }
    try {
      const ids = await this.dexieTable.bulkAdd(items as T[], { allKeys: true });
      if (!ids) return undefined;

      return items.map((item, index) => ({ id: ids[index], ...item })) as T[];
    } catch (error) {
      console.log('Error creating object - ', error);

      return undefined;
    }
  }

  async put(item: NoID<T>): Promise<T | undefined> {
    try {
      const id = await this.dexieTable.put(item as T);
      if (!id) return undefined;

      return { id, ...item } as T;
    } catch (error) {
      console.log('Error putting object - ', error);

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

  async update(id: K, item: UpdateSpec<T>): Promise<K | undefined> {
    try {
      const isUpdated = await this.dexieTable.update(id, item);

      return isUpdated ? id : undefined;
    } catch (error) {
      console.log('Error updating object - ', error);

      return Promise.resolve(undefined);
    }
  }

  async updateAll(items: (UpdateSpec<T> & { id: K })[]): Promise<K[] | undefined> {
    if (items.length === 0) {
      return undefined;
    }

    const updateItem = (item: UpdateSpec<T> & { id: K }) => this.dexieTable.update(item.id, item);

    try {
      try {
        await this.dexieTable.bulkUpdate(
          items.map(({ id, ...changes }) => ({ key: id, changes: changes as UpdateSpec<T> })),
        );
      } catch {
        await this.dexieTable.db.transaction('rw', this.dexieTable, () => {
          return Promise.all(items.map(updateItem));
        });
      }

      return items.map((item) => item.id);
    } catch (error) {
      console.log('Error updating object - ', error);

      return Promise.resolve(undefined);
    }
  }

  async insertAll(items: T[]): Promise<K[] | undefined> {
    try {
      return this.dexieTable.bulkPut(items as T[], { allKeys: true });
    } catch (error) {
      console.log('Error inserting object - ', error);

      return Promise.resolve(undefined);
    }
  }

  async delete(id: K): Promise<K | undefined> {
    try {
      await this.dexieTable.delete(id);

      return id;
    } catch (error) {
      console.log('Error deleting object - ', error);

      return Promise.resolve(undefined);
    }
  }

  async deleteAll(ids: K[]): Promise<K[] | undefined> {
    try {
      await this.dexieTable.bulkDelete(ids);

      return ids;
    } catch (error) {
      console.log('Error deleting objects - ', error);

      return Promise.resolve(undefined);
    }
  }
}

export const storageService = {
  wallets: new StorageService(dexieStorage.wallets),
  accounts2: new StorageService(dexieStorage.accounts2),
  contacts: new StorageService(dexieStorage.contacts),
  connections: new StorageService(dexieStorage.connections),
  proxies: new StorageService(dexieStorage.proxies),
  notifications: new StorageService(dexieStorage.notifications),
  metadata: new StorageService(dexieStorage.metadata),
  balances: new StorageService(dexieStorage.balances2),
  basketTransactions: new StorageService(dexieStorage.basketTransactions),
  operationDescriptions: new StorageService(dexieStorage.operationDescriptions),
  operationTemplates: new StorageService(dexieStorage.operationTemplates),
};
