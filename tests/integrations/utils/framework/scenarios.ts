/**
 * Pre-configured test scenarios for common use cases
 *
 * These helpers provide quick setup for common testing scenarios, reducing
 * boilerplate and ensuring consistency.
 *
 * @example
 *   import { createTransferScenario } from '@tests/integrations/utils/scenarios';
 *
 *   it('should test transfer', async () => {
 *     const env = await createTransferScenario();
 *     // ... test logic
 *     await env.cleanup();
 *   });
 */

import { type ApiPromise } from '@polkadot/api';
import { allSettled } from 'effector';

import { type AssetId, type Chain, type ChainId, ConnectionStatus } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { type AnyAccount, accounts as accountsDomain } from '@/domains/network';
import { balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { stakingPositions } from '@/aggregates/staking-positions';
import { walletSelect } from '@/aggregates/wallet-select';
import {
  polkadotAssetHubChain,
  polkadotChain,
  polkadotChainId,
  recipientAccount,
  senderAccount,
  senderBalance,
  stakingAccountA,
  stakingAccountB,
  stakingWallet,
  vaultWallet,
  watchOnlyWallet,
} from '../../fixtures';

import { type FeatureTestEnvironment, FeatureTestBuilder } from './FeatureTestBuilder';
import { seedAccountHandlers } from './seedAccountHandlers';

/**
 * Creates a basic transfer scenario with: - Vault wallet - Sender account with
 * balance - Recipient account (watch-only) - Polkadot chain (connected)
 */
export async function createTransferScenario(): Promise<FeatureTestEnvironment> {
  return new FeatureTestBuilder()
    .withWallet(vaultWallet)
    .withWallet(watchOnlyWallet)
    .withAccount(senderAccount)
    .withAccount(recipientAccount)
    .withBalance(senderBalance)
    .withChain(polkadotChain)
    .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
    .build();
}

/**
 * Creates a transfer scenario with low balance for testing insufficient funds
 *
 * @param lowBalanceAmount - Amount in planck (default: 1000000000 = 0.1 DOT)
 */
export async function createLowBalanceScenario(lowBalanceAmount = '1000000000'): Promise<FeatureTestEnvironment> {
  const lowBalance = {
    ...senderBalance,
    total: lowBalanceAmount,
  };

  return new FeatureTestBuilder()
    .withWallet(vaultWallet)
    .withWallet(watchOnlyWallet)
    .withAccount(senderAccount)
    .withAccount(recipientAccount)
    .withBalance(lowBalance)
    .withChain(polkadotChain)
    .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
    .build();
}

/**
 * Creates a disconnected chain scenario for testing offline behavior
 */
export async function createDisconnectedScenario(): Promise<FeatureTestEnvironment> {
  return new FeatureTestBuilder()
    .withWallet(vaultWallet)
    .withAccount(senderAccount)
    .withBalance(senderBalance)
    .withChain(polkadotChain)
    .withConnectionStatus(polkadotChainId, ConnectionStatus.DISCONNECTED)
    .build();
}

/**
 * Creates a minimal scenario with just wallet and account Useful for testing
 * features that don't need balances or chains
 */
export async function createMinimalScenario(): Promise<FeatureTestEnvironment> {
  return new FeatureTestBuilder().withWallet(vaultWallet).withAccount(senderAccount).build();
}

/**
 * Creates a multi-account scenario with multiple accounts and balances
 *
 * @param accountCount - Number of accounts to create (default: 3)
 */
export async function createMultiAccountScenario(accountCount = 3): Promise<FeatureTestEnvironment> {
  const accounts = [];
  const balances = [];

  for (let i = 0; i < accountCount; i++) {
    const account = {
      ...senderAccount,
      id: `account-${i}`,
      accountId: createAccountId(`multi-account-${i}`),
      name: `Account ${i + 1}`,
    };

    const balance = {
      ...senderBalance,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- AssetId is a branded number type
      id: balanceUtils.constructBalanceId(account.accountId, polkadotChainId, 0 as AssetId),
      accountId: account.accountId,
      total: `${(i + 1) * 10000000000000}`, // Different amounts
    };

    accounts.push(account);
    balances.push(balance);
  }

  return new FeatureTestBuilder()
    .withWallet(vaultWallet)
    .withAccounts(accounts)
    .withBalances(balances)
    .withChain(polkadotChain)
    .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
    .build();
}

/**
 * Creates a storage-only scenario (no network or chains) Useful for testing
 * storage operations without network concerns
 */
export async function createStorageOnlyScenario(): Promise<FeatureTestEnvironment> {
  return new FeatureTestBuilder().withWallet(vaultWallet).withAccount(senderAccount).withBalance(senderBalance).build();
}

export type StakingScenarioParams = {
  /** Staking chains present in the running network config. */
  chains?: Chain[];
  accounts?: AnyAccount[];
  /** Connected apis, keyed by chain — usually built with `createStakingApi`. */
  apis?: Record<ChainId, ApiPromise>;
};

export type StakingScenario = {
  env: FeatureTestEnvironment;
  /**
   * Flushes every pending scope computation. Chain emissions arrive through
   * `scopeBind`-ed events, so each one has to settle before assertions.
   */
  settle(): Promise<void>;
};

/**
 * Staking dashboard scenario: a wallet whose accounts are universal, the given
 * Asset Hub chains, and the given apis.
 *
 * Stores seeded through `fork({ values })` never emit, so the apis are pushed
 * afterwards — which is also the runtime order: chains and accounts are known
 * before a node connects.
 */
export async function createStakingScenario({
  chains = [polkadotAssetHubChain],
  accounts = [stakingAccountA, stakingAccountB],
  apis = {},
}: StakingScenarioParams = {}): Promise<StakingScenario> {
  const builder = new FeatureTestBuilder({ autoPopulate: false })
    .withChains(chains)
    .withStoreValue(walletModel.__test.$rawWallets, [stakingWallet])
    .withStoreValue(accountsDomain.__test.$list, accounts)
    .withStoreValue(walletSelect.__test.$selectedWalletId, stakingWallet.id);

  for (const chain of chains) {
    builder.withConnectionStatus(chain.chainId, ConnectionStatus.CONNECTED);
  }

  const env = await builder.build();

  // DI handlers register through unscoped events at import time, so without
  // this every `isAccountAvailableOnChain` check inside the scope is false and
  // no chain ever gets an account.
  await seedAccountHandlers(env.scope);

  // The dashboard hands its account selection to the positions aggregate; the
  // aggregate never reads the selected wallet. Selected before the apis land,
  // as at runtime, so the first subscription start is the only start.
  await allSettled(stakingPositions.selectAccountIds, {
    scope: env.scope,
    params: accounts.map((account) => account.accountId),
  });

  const settle = () => allSettled(env.scope);

  if (Object.keys(apis).length > 0) {
    await allSettled(networkModel.$apis, { scope: env.scope, params: apis });
  }

  return { env, settle };
}

/**
 * Creates a custom scenario with builder pattern
 *
 * @example
 *   const env = await createCustomScenario()
 *     .withAccount(myAccount)
 *     .withBalance(myBalance)
 *     .build();
 */
export function createCustomScenario(): FeatureTestBuilder {
  return new FeatureTestBuilder();
}
