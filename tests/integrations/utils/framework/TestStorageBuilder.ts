import Dexie from 'dexie';
import 'fake-indexeddb/auto';

import { type Balance, type Contact, type Wallet } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';

/**
 * TestStorageBuilder provides a fluent API for creating and managing fake
 * IndexedDB storage for integration tests.
 *
 * @example
 *   const storage = new TestStorageBuilder()
 *     .withWallet(mockWallet)
 *     .withAccount(mockAccount)
 *     .build();
 *
 *   await storage.open();
 *   // ... use in tests
 *   await storage.cleanup();
 */
export class TestStorageBuilder {
  private db: Dexie;
  private wallets: Wallet[] = [];
  private accounts: AnyAccount[] = [];
  private balances: unknown[] = [];
  private contacts: Contact[] = [];
  private proxies: unknown[] = [];
  private connections: unknown[] = [];
  private notifications: unknown[] = [];
  private basketTransactions: unknown[] = [];
  private multisigOperations: unknown[] = [];
  private metadata: unknown[] = [];
  private isOpened = false;

  constructor(private dbName = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`) {
    this.db = new Dexie(this.dbName);
    this.setupSchema();
  }

  /**
   * Sets up the database schema matching production version 35 This should be
   * kept in sync with src/renderer/shared/api/storage/service/dexie.ts
   */
  private setupSchema(): void {
    this.db.version(35).stores({
      wallets: '++id',
      accounts2: 'id',
      balances2: '[accountId+chainId+assetId],[accountId+chainId]',
      contacts: '++id',
      proxies: '++id',
      connections: '++id',
      notifications: '++id',
      basketTransactions: '++id',
      multisigOperations: 'id',
      metadata: '++id',
    });
  }

  /**
   * Add a wallet to the test storage
   */
  withWallet(wallet: Wallet): this {
    this.wallets.push(wallet);
    return this;
  }

  /**
   * Add multiple wallets to the test storage
   */
  withWallets(wallets: Wallet[]): this {
    this.wallets.push(...wallets);
    return this;
  }

  /**
   * Add an account to the test storage
   */
  withAccount(account: AnyAccount): this {
    this.accounts.push(account);
    return this;
  }

  /**
   * Add multiple accounts to the test storage
   */
  withAccounts(accounts: AnyAccount[]): this {
    this.accounts.push(...accounts);
    return this;
  }

  /**
   * Add a balance to the test storage
   */
  withBalance(balance: Balance): this {
    this.balances.push(balance);
    return this;
  }

  /**
   * Add multiple balances to the test storage
   */
  withBalances(balances: Balance[]): this {
    this.balances.push(...balances);
    return this;
  }

  /**
   * Add a contact to the test storage
   */
  withContact(contact: Contact): this {
    this.contacts.push(contact);
    return this;
  }

  /**
   * Add multiple contacts to the test storage
   */
  withContacts(contacts: Contact[]): this {
    this.contacts.push(...contacts);
    return this;
  }

  /**
   * Add a proxy to the test storage
   */
  withProxy(proxy: unknown): this {
    this.proxies.push(proxy);
    return this;
  }

  /**
   * Add a connection to the test storage
   */
  withConnection(connection: unknown): this {
    this.connections.push(connection);
    return this;
  }

  /**
   * Add a notification to the test storage
   */
  withNotification(notification: unknown): this {
    this.notifications.push(notification);
    return this;
  }

  /**
   * Add a basket transaction to the test storage
   */
  withBasketTransaction(transaction: unknown): this {
    this.basketTransactions.push(transaction);
    return this;
  }

  /**
   * Add a multisig operation to the test storage
   */
  withMultisigOperation(operation: unknown): this {
    this.multisigOperations.push(operation);
    return this;
  }

  /**
   * Add metadata to the test storage
   */
  withMetadata(metadata: unknown): this {
    this.metadata.push(metadata);
    return this;
  }

  /**
   * Opens the database and seeds it with all configured data
   */
  async open(): Promise<this> {
    if (this.isOpened) {
      return this;
    }

    await this.db.open();

    // Seed all tables
    if (this.wallets.length > 0) {
      await this.db.table('wallets').bulkAdd(this.wallets);
    }
    if (this.accounts.length > 0) {
      await this.db.table('accounts2').bulkAdd(this.accounts);
    }
    if (this.balances.length > 0) {
      await this.db.table('balances2').bulkAdd(this.balances);
    }
    if (this.contacts.length > 0) {
      await this.db.table('contacts').bulkAdd(this.contacts);
    }
    if (this.proxies.length > 0) {
      await this.db.table('proxies').bulkAdd(this.proxies);
    }
    if (this.connections.length > 0) {
      await this.db.table('connections').bulkAdd(this.connections);
    }
    if (this.notifications.length > 0) {
      await this.db.table('notifications').bulkAdd(this.notifications);
    }
    if (this.basketTransactions.length > 0) {
      await this.db.table('basketTransactions').bulkAdd(this.basketTransactions);
    }
    if (this.multisigOperations.length > 0) {
      await this.db.table('multisigOperations').bulkAdd(this.multisigOperations);
    }
    if (this.metadata.length > 0) {
      await this.db.table('metadata').bulkAdd(this.metadata);
    }

    this.isOpened = true;
    return this;
  }

  /**
   * Returns the Dexie database instance for direct access
   */
  getDb(): Dexie {
    return this.db;
  }

  /**
   * Returns the database name
   */
  getDbName(): string {
    return this.dbName;
  }

  /**
   * Checks if a table satisfies a condition
   *
   * @example
   *   const hasWallet = await storage.verifyTable('wallets', (wallets) =>
   *     wallets.some((w) => w.name === 'Test Wallet'),
   *   );
   */
  async verifyTable<T = unknown>(tableName: string, condition: (items: T[]) => boolean): Promise<boolean> {
    const items = await this.db.table(tableName).toArray();
    return condition(items);
  }

  /**
   * Get all items from a table
   */
  async getTableData<T = unknown>(tableName: string): Promise<T[]> {
    return this.db.table(tableName).toArray();
  }

  /**
   * Clear all data from a specific table
   */
  async clearTable(tableName: string): Promise<void> {
    await this.db.table(tableName).clear();
  }

  /**
   * Add data to a table after initialization
   */
  async addToTable(tableName: string, data: unknown | unknown[]): Promise<void> {
    if (Array.isArray(data)) {
      await this.db.table(tableName).bulkAdd(data);
    } else {
      await this.db.table(tableName).add(data);
    }
  }

  /**
   * Closes the database connection and deletes the test database
   */
  async cleanup(): Promise<void> {
    if (this.isOpened) {
      await this.db.close();
      this.isOpened = false;
    }
    await this.db.delete();
  }

  /**
   * Alias for open() - builds and returns the storage instance
   */
  async build(): Promise<this> {
    return this.open();
  }

  /**
   * Reset all stored data without closing the database
   */
  reset(): this {
    this.wallets = [];
    this.accounts = [];
    this.balances = [];
    this.contacts = [];
    this.proxies = [];
    this.connections = [];
    this.notifications = [];
    this.basketTransactions = [];
    this.multisigOperations = [];
    this.metadata = [];
    return this;
  }
}
