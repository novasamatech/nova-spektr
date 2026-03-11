/**
 * Integration testing utilities for Nova Spektr
 *
 * Organized by feature domain:
 *
 * - **framework/** - Core testing framework (builders, environment, scenarios)
 * - **builders/** - Data builders for dynamic test fixtures
 * - **network/** - Network utilities (connections, fetch, accounts)
 * - **chain/** - Chain data utilities
 * - **common/** - Shared constants
 *
 * @module tests/integrations/utils
 *
 * @example
 *   import {
 *     FeatureTestBuilder,
 *     createTransferScenario,
 *   } from '@tests/integrations/utils';
 *
 *   // Using builder
 *   const env = await new FeatureTestBuilder()
 *     .withWallet(vaultWallet)
 *     .withAccount(senderAccount)
 *     .build();
 *
 *   // Using scenario
 *   const env = await createTransferScenario();
 */

// Core framework (most commonly used)
export * from './framework';

// Feature-specific utilities
export * from './builders';
export * from './chain';
export * from './network';

// Common utilities
export * from './common';

// Allure metadata for integration tests
export * from './allure';
