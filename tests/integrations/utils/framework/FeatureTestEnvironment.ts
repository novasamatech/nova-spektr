import type Dexie from 'dexie';
import { type EventCallable, type Scope, type Store, allSettled } from 'effector';

import { type Feature } from '@/shared/feature';

/**
 * FeatureTestEnvironment provides a high-level API for testing features with
 * full integration including storage, state management, and event handling.
 *
 * @example
 *   const env = await new FeatureTestBuilder()
 *     .withWallet(mockWallet)
 *     .withAccount(mockAccount)
 *     .build();
 *
 *   await env.startFeature(myFeature);
 *   await env.executeEvent(myFeature.events.doSomething, { data: 'test' });
 *   expect(env.getState(myFeature.$status)).toBe('running');
 *
 *   await env.cleanup();
 */
export class FeatureTestEnvironment {
  constructor(
    public readonly scope: Scope,
    public readonly db: Dexie,
    private cleanupFn: () => Promise<void>,
  ) {}

  /**
   * Start a feature in the test environment
   *
   * @param feature - The feature to start
   *
   * @returns Promise that resolves when the feature is started
   */
  async startFeature<T>(feature: Feature<T>): Promise<void> {
    await allSettled(feature.start, { scope: this.scope });
  }

  /**
   * Stop a feature in the test environment
   *
   * @param feature - The feature to stop
   *
   * @returns Promise that resolves when the feature is stopped
   */
  async stopFeature<T>(feature: Feature<T>): Promise<void> {
    await allSettled(feature.stop, { scope: this.scope });
  }

  /**
   * Get the current state of a store
   *
   * @param store - The Effector store to read
   *
   * @returns The current value of the store
   */
  getState<T>(store: Store<T>): T {
    return this.scope.getState(store);
  }

  /**
   * Execute an event with parameters
   *
   * @param event - The Effector event to trigger
   * @param params - Parameters to pass to the event
   *
   * @returns Promise that resolves when all effects are completed
   */
  async executeEvent<T>(event: EventCallable<T>, params: T): Promise<void> {
    await allSettled(event, { scope: this.scope, params });
  }

  /**
   * Execute an event without parameters
   *
   * @param event - The Effector event to trigger
   *
   * @returns Promise that resolves when all effects are completed
   */
  async executeEventVoid(event: EventCallable<void>): Promise<void> {
    await allSettled(event, { scope: this.scope, params: undefined });
  }

  /**
   * Verify that a database table satisfies a condition
   *
   * @example
   *   await env.verifyInStorage(
   *     'wallets',
   *     (wallets) => wallets.length === 1,
   *   );
   *
   * @param tableName - Name of the table to verify
   * @param condition - Function that returns true if the condition is met
   *
   * @returns Promise that resolves to true if condition is met
   */
  async verifyInStorage<T = any>(tableName: string, condition: (items: T[]) => boolean): Promise<boolean> {
    const items = await this.db.table(tableName).toArray();
    return condition(items);
  }

  /**
   * Get all data from a storage table
   *
   * @param tableName - Name of the table to query
   *
   * @returns Promise that resolves to an array of items
   */
  async getStorageData<T = any>(tableName: string): Promise<T[]> {
    return this.db.table(tableName).toArray();
  }

  /**
   * Add data to a storage table during the test
   *
   * @param tableName - Name of the table
   * @param data - Data to add
   */
  async addToStorage(tableName: string, data: any | any[]): Promise<void> {
    if (Array.isArray(data)) {
      await this.db.table(tableName).bulkAdd(data);
    } else {
      await this.db.table(tableName).add(data);
    }
  }

  /**
   * Update data in a storage table
   *
   * @param tableName - Name of the table
   * @param id - ID of the item to update
   * @param changes - Changes to apply
   */
  async updateInStorage(tableName: string, id: any, changes: any): Promise<void> {
    await this.db.table(tableName).update(id, changes);
  }

  /**
   * Delete data from a storage table
   *
   * @param tableName - Name of the table
   * @param id - ID of the item to delete
   */
  async deleteFromStorage(tableName: string, id: any): Promise<void> {
    await this.db.table(tableName).delete(id);
  }

  /**
   * Wait for a store to match a condition
   *
   * @example
   *   await env.waitForState(
   *     feature.$status,
   *     (status) => status === 'running',
   *   );
   *
   * @param store - Store to watch
   * @param condition - Condition function
   * @param timeout - Maximum time to wait in milliseconds (default: 5000)
   *
   * @returns Promise that resolves when condition is met or rejects on timeout
   */
  async waitForState<T>(store: Store<T>, condition: (value: T) => boolean, timeout = 5000): Promise<T> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkCondition = () => {
        const value = this.getState(store);

        if (condition(value)) {
          resolve(value);
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for store condition after ${timeout}ms`));
          return;
        }

        setTimeout(checkCondition, 50);
      };

      checkCondition();
    });
  }

  /**
   * Clean up the test environment (close database and delete test data)
   */
  async cleanup(): Promise<void> {
    await this.cleanupFn();
  }
}
