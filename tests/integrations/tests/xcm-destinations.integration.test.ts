import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chainsService } from '@/shared/api/network';
import { type Chain } from '@/shared/core';
import {
  FeatureTestBuilder,
  type FeatureTestEnvironment,
  collectXcmDestinationsWithStats,
  saveXcmDestinationsToFile,
  setupFetchPolyfill,
} from '../utils';

/**
 * Integration test for collecting and documenting all available XCM transfer
 * destinations
 *
 * ## Purpose
 *
 * This test collects all available XCM (Cross-Consensus Message) transfer
 * routes supported by Nova Spektr and generates a comprehensive markdown
 * documentation file.
 *
 * ## What it does
 *
 * 1. **Loads all chains** from the network configuration using `chainsService`
 * 2. **Iterates through each chain and asset** to discover available XCM
 *    destinations
 * 3. **Queries the ParaSpell SDK** via `spellXcmService.getAvailableTransfers()`
 *    to get supported destinations for each chain-asset combination
 * 4. **Applies filtering** based on Nova Spektr's whitelist/blacklist rules
 * 5. **Generates markdown documentation** with:
 *
 *    - Summary statistics (total routes, unique networks, tokens)
 *    - Most connected networks
 *    - Token distribution
 *    - Detailed route listings organized by source network and token
 * 6. **Saves the documentation** to `tests/integrations/docs/xcm-destinations.md`
 *
 * ## Generated Output
 *
 * The test generates a markdown file containing:
 *
 * - **Summary Section**: High-level statistics about available routes
 * - **Most Connected Networks**: Networks with the most destination options
 * - **Token Distribution**: Number of routes per token/asset
 * - **Detailed Routes**: Complete listing organized by:
 *
 *   - Source Network (alphabetically sorted)
 *   - Token/Asset (alphabetically sorted)
 *   - Destination Networks (in table format)
 *
 * ## Usage
 *
 * Run this test to regenerate the XCM destinations documentation:
 *
 * ```bash
 * npm test -- xcm-destinations.integration.test.ts
 * ```
 *
 * The generated file is saved to: `tests/integrations/docs/xcm-destinations.md`
 *
 * ## Notes
 *
 * - Routes are determined by the ParaSpell SDK and filtered through Nova Spektr's
 *   whitelist/blacklist configuration
 * - Only chains with valid spell name mappings are included
 * - The test uses a fetch polyfill to avoid CORS restrictions in the test
 *   environment
 * - The generated documentation reflects the current state of XCM support in Nova
 *   Spektr
 *
 * @group integration
 * @group xcm
 * @group xcm-destinations
 * @group documentation
 */
describe('XCM Destinations Collection', () => {
  let env: FeatureTestEnvironment;
  let allChains: Chain[] = [];
  let restoreFetch: (() => void) | undefined;

  beforeAll(async () => {
    // Setup fetch polyfill to avoid CORS issues in happy-dom test environment
    restoreFetch = setupFetchPolyfill();

    // Load all chains from the network configuration
    const chains = await chainsService.getChainsData();
    if (!chains || chains.length === 0) {
      throw new Error('Failed to load chains data or chains array is empty');
    }
    allChains = chains;

    // Initialize XCM whitelist from nova-utils
    const { spellXcmService } = await import('@/shared/api/xcm/service/spellXcmService');
    await spellXcmService.initializeXcmWhitelist(allChains);

    // Create minimal test environment (required for integration test setup)
    env = await new FeatureTestBuilder().build();
  });

  afterAll(async () => {
    // Restore original fetch
    if (restoreFetch) {
      restoreFetch();
    }

    if (env) {
      await env.cleanup();
    }
  });

  it('should collect all available XCM destinations and save to markdown', async () => {
    // Collect all XCM destinations for all chains and assets with statistics
    const { destinations, stats } = await collectXcmDestinationsWithStats(allChains);

    // Verify we collected some destinations
    expect(destinations.length).toBeGreaterThan(0);

    // Save to markdown file with statistics
    const outputPath = saveXcmDestinationsToFile(destinations, stats);

    // Log success message with statistics
    console.log(`\n✅ Collected ${destinations.length} XCM destinations`);
    console.log(`📊 Statistics:`);
    console.log(`   - Total destinations from ParaSpell library: ${stats.totalFromParaSpell}`);
    console.log(`   - Destinations after whitelist applied: ${stats.afterWhitelist}`);
    console.log(`   - Destinations banned by blacklist: ${stats.bannedByBlacklist}`);
    console.log(`   - Destinations filtered by whitelist (not whitelisted): ${stats.filteredByWhitelist}`);
    console.log(`📄 Saved to: ${outputPath}`);
  });
});
