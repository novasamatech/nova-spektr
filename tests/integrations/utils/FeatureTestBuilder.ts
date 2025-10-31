import { type Scope, allSettled, fork } from 'effector';

import { type Balance, type Chain, type Contact, type Wallet } from '@/shared/core';
import { type AnyAccount, accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';

import { FeatureTestEnvironment } from './FeatureTestEnvironment';
import { TestStorageBuilder } from './TestStorageBuilder';

/**
 * Configuration options for FeatureTestBuilder
 */
export interface FeatureTestBuilderOptions {
  /**
   * Custom database name for the test storage
   */
  dbName?: string;

  /**
   * Whether to automatically populate stores from storage
   *
   * @default true
   */
  autoPopulate?: boolean;

  /**
   * Initial values for Effector stores
   */
  initialValues?: Map<any, any>;
}

/**
 * FeatureTestBuilder provides a fluent API for creating comprehensive test
 * environments for feature integration testing.
 *
 * It combines storage setup, Effector scope creation, and data population into
 * a single, easy-to-use interface.
 *
 * @example
 *   const env = await new FeatureTestBuilder()
 *     .withWallet(mockWallet)
 *     .withAccount(mockAccount)
 *     .withChain(polkadotChain)
 *     .build();
 *
 *   await env.startFeature(transferFeature);
 *   // ... test logic
 *   await env.cleanup();
 */
export class FeatureTestBuilder {
  private storage: TestStorageBuilder;
  private chains: Record<string, Chain> = {};
  private apis: Record<string, any> = {};
  private connectionStatuses: Record<string, string> = {};
  private options: Required<FeatureTestBuilderOptions>;

  constructor(options: FeatureTestBuilderOptions = {}) {
    this.options = {
      dbName: options.dbName || `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      autoPopulate: options.autoPopulate ?? true,
      initialValues: options.initialValues || new Map(),
    };

    this.storage = new TestStorageBuilder(this.options.dbName);
  }

  // Storage methods (delegate to TestStorageBuilder)

  /**
   * Add a wallet to the test environment
   */
  withWallet(wallet: Wallet): this {
    this.storage.withWallet(wallet);
    return this;
  }

  /**
   * Add multiple wallets to the test environment
   */
  withWallets(wallets: Wallet[]): this {
    this.storage.withWallets(wallets);
    return this;
  }

  /**
   * Add an account to the test environment
   */
  withAccount(account: AnyAccount): this {
    this.storage.withAccount(account);
    return this;
  }

  /**
   * Add multiple accounts to the test environment
   */
  withAccounts(accounts: AnyAccount[]): this {
    this.storage.withAccounts(accounts);
    return this;
  }

  /**
   * Add a balance to the test environment
   */
  withBalance(balance: Balance): this {
    this.storage.withBalance(balance);
    return this;
  }

  /**
   * Add multiple balances to the test environment
   */
  withBalances(balances: Balance[]): this {
    this.storage.withBalances(balances);
    return this;
  }

  /**
   * Add a contact to the test environment
   */
  withContact(contact: Contact): this {
    this.storage.withContact(contact);
    return this;
  }

  /**
   * Add a chain to the test environment Chains are stored in
   * networkModel.$chains
   */
  withChain(chain: Chain): this {
    this.chains[chain.chainId] = chain;
    return this;
  }

  /**
   * Add multiple chains to the test environment
   */
  withChains(chains: Chain[]): this {
    for (const chain of chains) {
      this.chains[chain.chainId] = chain;
    }
    return this;
  }

  /**
   * Add an API connection for a chain
   */
  withApi(chainId: string, api: any): this {
    this.apis[chainId] = api;
    return this;
  }

  /**
   * Set connection status for a chain
   */
  withConnectionStatus(chainId: string, status: string): this {
    this.connectionStatuses[chainId] = status;
    return this;
  }

  /**
   * Add a proxy to the test environment
   */
  withProxy(proxy: any): this {
    this.storage.withProxy(proxy);
    return this;
  }

  /**
   * Add a multisig operation to the test environment
   */
  withMultisigOperation(operation: any): this {
    this.storage.withMultisigOperation(operation);
    return this;
  }

  /**
   * Add a basket transaction to the test environment
   */
  withBasketTransaction(transaction: any): this {
    this.storage.withBasketTransaction(transaction);
    return this;
  }

  /**
   * Add metadata to the test environment
   */
  withMetadata(metadata: any): this {
    this.storage.withMetadata(metadata);
    return this;
  }

  /**
   * Add a custom store value to the Effector scope
   */
  withStoreValue<T>(store: any, value: T): this {
    this.options.initialValues.set(store, value);
    return this;
  }

  /**
   * Build the test environment:
   *
   * 1. Opens and seeds the storage
   * 2. Creates an Effector scope with initial values
   * 3. Populates stores from storage (if autoPopulate is true)
   * 4. Returns a FeatureTestEnvironment for testing
   *
   * @returns Promise that resolves to a FeatureTestEnvironment
   */
  async build(): Promise<FeatureTestEnvironment> {
    // Open and seed storage
    await this.storage.open();

    // Create Effector scope with initial values
    const initialValues = this.options.initialValues;

    // Add network-related values
    if (Object.keys(this.chains).length > 0) {
      initialValues.set(networkModel.$chains, this.chains);
    }
    if (Object.keys(this.apis).length > 0) {
      initialValues.set(networkModel.$apis, this.apis);
    }
    if (Object.keys(this.connectionStatuses).length > 0) {
      initialValues.set(networkModel.$connectionStatuses, this.connectionStatuses);
    }

    const scope: Scope = fork({
      values: initialValues,
    });

    // Populate stores from storage if enabled
    if (this.options.autoPopulate) {
      await this.populateStores(scope);
    }

    // Create and return test environment
    return new FeatureTestEnvironment(scope, this.storage.getDb(), async () => {
      await this.storage.cleanup();
    });
  }

  /**
   * Populate Effector stores from storage
   */
  private async populateStores(scope: Scope): Promise<void> {
    // Populate accounts
    const accountsData = await this.storage.getTableData('accounts2');
    if (accountsData.length > 0) {
      await allSettled(accounts.populate, { scope });
    }

    // Populate wallets
    const walletsData = await this.storage.getTableData('wallets');
    if (walletsData.length > 0) {
      await allSettled(walletModel.populate, { scope });
    }

    // Populate balances
    const balancesData = await this.storage.getTableData('balances2');
    if (balancesData.length > 0) {
      await allSettled(balanceModel.populate, { scope });
    }
  }

  /**
   * Get the underlying TestStorageBuilder for advanced customization
   */
  getStorage(): TestStorageBuilder {
    return this.storage;
  }
}
