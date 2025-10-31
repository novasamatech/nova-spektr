/**
 * Test fixtures for Nova Spektr integration tests
 *
 * Provides pre-configured test data for common scenarios including:
 *
 * - Wallets (vault, multisig, watch-only, proxied)
 * - Accounts (sender, recipient, multisig, proxy)
 * - Balances (various amounts and assets)
 * - Chains (Polkadot, Kusama, Asset Hub, Bifrost)
 * - Transactions (native, asset, XCM, multisig)
 *
 * @module tests/integrations/fixtures
 *
 * @example
 *   import {
 *     vaultWallet,
 *     senderAccount,
 *     senderBalance,
 *   } from '@tests/integrations/fixtures';
 *
 *   const env = await new FeatureTestBuilder()
 *     .withWallet(vaultWallet)
 *     .withAccount(senderAccount)
 *     .withBalance(senderBalance)
 *     .build();
 */

export * from './transfer-fixtures';
