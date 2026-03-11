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

import { type AssetId, ConnectionStatus } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { balanceUtils } from '@/entities/balance';
import {
  polkadotChain,
  polkadotChainId,
  recipientAccount,
  senderAccount,
  senderBalance,
  vaultWallet,
  watchOnlyWallet,
} from '../../fixtures';

import { type FeatureTestEnvironment } from './FeatureTestBuilder';
import { FeatureTestBuilder } from './FeatureTestBuilder';

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
