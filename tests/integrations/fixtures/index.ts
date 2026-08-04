/**
 * Test fixtures for Nova Spektr integration tests
 *
 * Organized by feature domain:
 *
 * - **wallet/** - Wallet fixtures (vault, multisig, watch-only, proxied)
 * - **account/** - Account fixtures (sender, recipient, multisig, proxy)
 * - **balance/** - Balance fixtures (various amounts and assets)
 * - **chain/** - Chain fixtures (Polkadot, Kusama, Asset Hub, Bifrost)
 * - **transaction/** - Transaction templates (native, asset, XCM, multisig)
 * - **governance/** - Governance fixtures (referendums, delegations, votes)
 * - **fellowship/** - Fellowship fixtures (members, referendums, salary)
 * - **staking/** - Staking fixtures (Asset Hub chains, stashes, validators)
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

export * from './account';
export * from './balance';
export * from './chain';
export * from './fellowship';
export * from './governance';
export * from './staking';
export * from './transaction';
export * from './wallet';
