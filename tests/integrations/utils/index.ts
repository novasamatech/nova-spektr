/**
 * Integration testing utilities for Nova Spektr
 *
 * This module provides a comprehensive set of tools for writing integration
 * tests with storage, state management, and feature testing.
 *
 * @module tests/integrations/utils
 *
 * @example
 *   import { FeatureTestBuilder } from '@tests/integrations/utils';
 *
 *   const env = await new FeatureTestBuilder()
 *     .withWallet(mockWallet)
 *     .withAccount(mockAccount)
 *     .build();
 *
 *   await env.startFeature(myFeature);
 *   expect(env.getState(myFeature.status)).toBe('running');
 *   await env.cleanup();
 */

export { TestStorageBuilder } from './TestStorageBuilder';
export { FeatureTestEnvironment } from './FeatureTestEnvironment';
export { FeatureTestBuilder, type FeatureTestBuilderOptions } from './FeatureTestBuilder';
export {
  collectXcmDestinations,
  formatXcmDestinationsMarkdown,
  getChainBySpellName,
  saveXcmDestinationsToFile,
  type XcmDestination,
} from './xcmDestinationsCollector';
export { createNodeFetchPolyfill, setupFetchPolyfill } from './fetchPolyfill';
