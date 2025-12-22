import { writeFileSync } from 'fs';
import { join } from 'path';

import { Native, getSupportedDestinations } from '@paraspell/sdk-pjs';

import {
  XCM_DESTINATION_BLACKLIST,
  XCM_DESTINATION_WHITELIST_LEGACY,
  type XcmDestinationBlacklistEntry,
  type XcmDestinationWhitelistEntry,
  getXcmWhitelist,
} from '@/shared/api/xcm/service/constants';
import { spellXcmService } from '@/shared/api/xcm/service/spellXcmService';
import { type Asset, AssetType, type Chain, type ChainId } from '@/shared/core';
import { CHAIN_ID_TO_SPELL_NAME_MAP, nonNullable } from '@/shared/lib/utils';

/**
 * Represents an XCM transfer destination route
 */
export type XcmDestination = {
  sourceNetwork: string;
  token: string;
  destinationNetwork: string;
};

/**
 * Statistics about XCM destination filtering
 */
export type XcmDestinationStats = {
  totalFromParaSpell: number;
  afterWhitelist: number;
  bannedByBlacklist: number;
  filteredByWhitelist: number;
};

/**
 * Maps a spell chain name back to the actual Chain object
 *
 * @param spellName - The spell chain name (e.g., "Polkadot", "Kusama")
 * @param allChains - Array of all available chains
 *
 * @returns The Chain object if found, null otherwise
 */
export function getChainBySpellName(spellName: string, allChains: Chain[]): Chain | null {
  const entry = Object.entries(CHAIN_ID_TO_SPELL_NAME_MAP).find(([, name]) => name === spellName);

  if (!entry) {
    return null;
  }

  const chainId = entry[0] as ChainId;
  return allChains.find((chain) => chain.chainId === chainId) || null;
}

/**
 * Checks if a route is blacklisted
 */
function isRouteBlacklisted(sourceChainId: ChainId, destinationChainId: ChainId): boolean {
  return XCM_DESTINATION_BLACKLIST.some((entry: XcmDestinationBlacklistEntry) => {
    const hasSource = nonNullable(entry.sourceChainId);
    const hasDestination = nonNullable(entry.destinationChainId);

    if (hasSource && hasDestination) {
      return entry.sourceChainId === sourceChainId && entry.destinationChainId === destinationChainId;
    }

    if (hasSource) {
      return entry.sourceChainId === sourceChainId;
    }

    if (hasDestination) {
      return entry.destinationChainId === destinationChainId;
    }

    return false;
  });
}

let cachedWhitelistForTest: XcmDestinationWhitelistEntry[] | null = null;

/**
 * Gets whitelist entries for testing (uses cached from service or loads)
 */
async function getWhitelistForTest(chains: Chain[]): Promise<XcmDestinationWhitelistEntry[]> {
  if (cachedWhitelistForTest) {
    return cachedWhitelistForTest;
  }

  try {
    const entries = await getXcmWhitelist(chains);
    cachedWhitelistForTest = entries;
    return entries;
  } catch {
    // Fallback to legacy
    return XCM_DESTINATION_WHITELIST_LEGACY;
  }
}

/**
 * Checks if a route is whitelisted
 */
function isRouteWhitelisted(
  sourceChainId: ChainId,
  destinationChainId: ChainId,
  sourceAssetSymbol?: string,
  whitelistEntries?: XcmDestinationWhitelistEntry[],
): boolean {
  const entries = whitelistEntries || XCM_DESTINATION_WHITELIST_LEGACY;

  if (!entries || entries.length === 0) {
    return false;
  }

  return entries.some((entry) => {
    if (entry.sourceChainId !== sourceChainId || entry.destinationChainId !== destinationChainId) {
      return false;
    }

    if (sourceAssetSymbol && entry.sourceAsset && entry.sourceAsset !== sourceAssetSymbol) {
      return false;
    }

    return true;
  });
}

/**
 * Gets chain ID by spell name
 */
function getChainIdBySpellName(spellChainName: string): ChainId | null {
  const entry = Object.entries(CHAIN_ID_TO_SPELL_NAME_MAP).find(([, name]) => name === spellChainName);
  return entry ? (entry[0] as ChainId) : null;
}

/**
 * Creates currency input for ParaSpell SDK
 */
function createCurrencyInput(
  asset: Asset,
  amount: string,
): { amount: string | number; symbol: string | ReturnType<typeof Native> } {
  const isNativeAsset = asset.type === AssetType.NATIVE;

  return {
    amount: Number(amount),
    symbol: isNativeAsset ? Native(asset.symbol) : asset.symbol,
  };
}

/**
 * Collects all available XCM destinations for all chains and assets with
 * statistics
 *
 * @param chains - Array of all available chains
 *
 * @returns Object containing destinations array and statistics
 */
export async function collectXcmDestinationsWithStats(chains: Chain[]): Promise<{
  destinations: XcmDestination[];
  stats: XcmDestinationStats;
}> {
  const destinations: XcmDestination[] = [];
  let totalFromParaSpell = 0;
  let bannedByBlacklist = 0;
  let filteredByWhitelist = 0;

  // Load whitelist from nova-utils
  const whitelistEntries = await getWhitelistForTest(chains);

  for (const chain of chains) {
    const sourceNetwork = chain.name;
    const spellChainName = spellXcmService.getSpellChainName(chain);

    // Skip chains that don't have a spell mapping
    if (!spellChainName) {
      continue;
    }

    // Iterate through all assets in the chain
    for (const asset of chain.assets) {
      const token = asset.symbol;

      try {
        // Get all destinations from ParaSpell SDK (before filtering)
        const currencyInput = createCurrencyInput(asset, '0');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allParaSpellDestinations = getSupportedDestinations(spellChainName as any, currencyInput);
        totalFromParaSpell += allParaSpellDestinations.length;

        if (allParaSpellDestinations.length > 0) {
          console.log(
            `\n📦 ParaSpell library returned ${allParaSpellDestinations.length} destinations for ${sourceNetwork} -> ${token}:`,
          );
          console.log(`   ${allParaSpellDestinations.join(', ')}`);
        }

        // Apply filtering logic (same as in spellXcmService)
        const filteredDestinations = allParaSpellDestinations.filter((destinationChainName) => {
          const destinationChainId = getChainIdBySpellName(destinationChainName);
          if (!destinationChainId) {
            console.log(`   ⚠️  ${destinationChainName}: No chain ID mapping found (skipped)`);
            return false;
          }

          // Check if blacklisted
          if (isRouteBlacklisted(chain.chainId, destinationChainId)) {
            bannedByBlacklist++;
            console.log(`   🚫 ${destinationChainName}: BLACKLISTED`);
            return false;
          }

          // Check if whitelisted
          const isWhitelisted = isRouteWhitelisted(chain.chainId, destinationChainId, asset.symbol, whitelistEntries);
          if (!isWhitelisted) {
            filteredByWhitelist++;
            console.log(`   ⚪ ${destinationChainName}: Not whitelisted (filtered out)`);
            return false;
          }

          console.log(`   ✅ ${destinationChainName}: Whitelisted (kept)`);
          return true;
        });

        // Map spell names back to chain names
        for (const spellDestinationName of filteredDestinations) {
          const destinationChain = getChainBySpellName(spellDestinationName, chains);

          if (destinationChain) {
            destinations.push({
              sourceNetwork,
              token,
              destinationNetwork: destinationChain.name,
            });
          } else {
            // If we can't find the chain, still include the spell name
            destinations.push({
              sourceNetwork,
              token,
              destinationNetwork: spellDestinationName,
            });
          }
        }
      } catch (error) {
        // Skip if ParaSpell SDK throws an error
        console.log(`   ❌ Error getting destinations for ${sourceNetwork} -> ${token}: ${error}`);
        continue;
      }
    }
  }

  return {
    destinations,
    stats: {
      totalFromParaSpell,
      afterWhitelist: destinations.length,
      bannedByBlacklist,
      filteredByWhitelist,
    },
  };
}

/**
 * Collects all available XCM destinations for all chains and assets
 *
 * @param chains - Array of all available chains
 *
 * @returns Promise resolving to array of XCM destinations
 */
export async function collectXcmDestinations(chains: Chain[]): Promise<XcmDestination[]> {
  const result = await collectXcmDestinationsWithStats(chains);
  return result.destinations;
}

/**
 * Formats XCM destinations into a human-readable markdown document
 *
 * @param destinations - Array of XCM destinations to format
 * @param stats - Optional statistics about filtering
 *
 * @returns Formatted markdown string
 */
export function formatXcmDestinationsMarkdown(destinations: XcmDestination[], stats?: XcmDestinationStats): string {
  // Calculate statistics
  const uniqueSourceNetworks = new Set(destinations.map((d) => d.sourceNetwork));
  const uniqueDestinationNetworks = new Set(destinations.map((d) => d.destinationNetwork));
  const uniqueTokens = new Set(destinations.map((d) => d.token));
  const allNetworks = new Set([...uniqueSourceNetworks, ...uniqueDestinationNetworks]);

  // Count routes per source network
  const routesPerSource = destinations.reduce(
    (acc, dest) => {
      acc[dest.sourceNetwork] = (acc[dest.sourceNetwork] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Count routes per token
  const routesPerToken = destinations.reduce(
    (acc, dest) => {
      acc[dest.token] = (acc[dest.token] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Find most connected networks (by number of destinations)
  const destinationsPerSource = destinations.reduce(
    (acc, dest) => {
      if (!acc[dest.sourceNetwork]) {
        acc[dest.sourceNetwork] = new Set();
      }
      acc[dest.sourceNetwork].add(dest.destinationNetwork);
      return acc;
    },
    {} as Record<string, Set<string>>,
  );

  const mostConnected = Object.entries(destinationsPerSource)
    .map(([network, dests]) => ({ network, count: dests.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Group by source network
  const groupedBySource = destinations.reduce(
    (acc, dest) => {
      const key = dest.sourceNetwork;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(dest);
      return acc;
    },
    {} as Record<string, XcmDestination[]>,
  );

  // Sort destinations within each source network by token, then destination
  for (const source of Object.keys(groupedBySource)) {
    groupedBySource[source].sort((a, b) => {
      if (a.token !== b.token) {
        return a.token.localeCompare(b.token);
      }
      return a.destinationNetwork.localeCompare(b.destinationNetwork);
    });
  }

  // Build markdown
  let markdown = '# XCM Transfer Destinations\n\n';
  markdown += '> This document is automatically generated by integration tests.\n';
  markdown += '> It lists all available XCM (Cross-Consensus Message) transfer routes in Nova Spektr.\n\n';

  // Summary section
  markdown += '## Summary\n\n';
  markdown += `**Generated on:** ${new Date().toISOString()}\n\n`;
  markdown += '### Statistics\n\n';
  markdown += `- **Total Transfer Routes:** ${destinations.length}\n`;
  markdown += `- **Unique Source Networks:** ${uniqueSourceNetworks.size}\n`;
  markdown += `- **Unique Destination Networks:** ${uniqueDestinationNetworks.size}\n`;
  markdown += `- **Total Unique Networks:** ${allNetworks.size}\n`;
  markdown += `- **Unique Tokens/Assets:** ${uniqueTokens.size}\n\n`;

  // Filtering statistics
  if (stats) {
    markdown += '### Filtering Statistics\n\n';
    markdown += 'Statistics about how destinations are filtered from ParaSpell library:\n\n';
    markdown += '| Metric | Count |\n';
    markdown += '|--------|-------|\n';
    markdown += `| Total destinations from ParaSpell library | ${stats.totalFromParaSpell} |\n`;
    markdown += `| Destinations after whitelist applied | ${stats.afterWhitelist} |\n`;
    markdown += `| Destinations banned by blacklist | ${stats.bannedByBlacklist} |\n`;
    markdown += `| Destinations filtered by whitelist (not whitelisted) | ${stats.filteredByWhitelist} |\n`;
    markdown += '\n';
  }

  // Most connected networks
  markdown += '### Most Connected Networks\n\n';
  markdown += 'Networks with the most destination options:\n\n';
  markdown += '| Network | Destination Count |\n';
  markdown += '|---------|-------------------|\n';
  for (const item of mostConnected) {
    markdown += `| ${item.network} | ${item.count} |\n`;
  }
  markdown += '\n';

  // Token distribution
  markdown += '### Token Distribution\n\n';
  markdown += 'Number of routes per token:\n\n';
  markdown += '| Token | Route Count |\n';
  markdown += '|-------|-------------|\n';
  const sortedTokens = Object.entries(routesPerToken)
    .sort((a, b) => b[1] - a[1])
    .map(([token, count]) => `| ${token} | ${count} |\n`)
    .join('');
  markdown += sortedTokens;
  markdown += '\n';

  markdown += '---\n\n';

  // Detailed routes section
  markdown += '## Detailed Routes\n\n';
  markdown += 'This section lists all available XCM transfer routes organized by source network and token.\n\n';

  // Sort source networks alphabetically
  const sortedSources = Object.keys(groupedBySource).sort();

  for (const sourceNetwork of sortedSources) {
    const routeCount = routesPerSource[sourceNetwork];
    markdown += `## ${sourceNetwork}\n\n`;
    markdown += `*${routeCount} transfer route${routeCount !== 1 ? 's' : ''} available*\n\n`;

    // Group by token within source network
    const byToken = groupedBySource[sourceNetwork].reduce(
      (acc, dest) => {
        const key = dest.token;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(dest);
        return acc;
      },
      {} as Record<string, XcmDestination[]>,
    );

    const sortedTokenKeys = Object.keys(byToken).sort();

    for (const token of sortedTokenKeys) {
      markdown += `### ${token}\n\n`;
      markdown += '| Destination Network |\n';
      markdown += '|---------------------|\n';

      const tokenDestinations = byToken[token];
      for (const destination of tokenDestinations) {
        markdown += `| ${destination.destinationNetwork} |\n`;
      }

      markdown += '\n';
    }

    markdown += '---\n\n';
  }

  // Footer
  markdown += '## Notes\n\n';
  markdown +=
    "- Routes are determined by the ParaSpell SDK and filtered through Nova Spektr's whitelist/blacklist rules.\n";
  markdown += '- This list reflects the current state of XCM support in Nova Spektr.\n';
  markdown += '- Some routes may require specific conditions (e.g., sufficient balance, network connectivity).\n';
  markdown += '- To regenerate this document, run: `npm test -- xcm-destinations.integration.test.ts`\n';

  return markdown;
}

/**
 * Saves XCM destinations to a markdown file
 *
 * @param destinations - Array of XCM destinations to save
 * @param stats - Optional statistics about filtering
 * @param outputPath - Optional path to save the file (defaults to
 *
 *   Tests/integrations/docs/xcm-destinations.md)
 *
 * @returns The path where the file was saved
 */
export function saveXcmDestinationsToFile(
  destinations: XcmDestination[],
  stats?: XcmDestinationStats,
  outputPath?: string,
): string {
  const markdown = formatXcmDestinationsMarkdown(destinations, stats);
  const finalPath = outputPath || join(process.cwd(), 'tests/integrations/docs/xcm-destinations.md');

  writeFileSync(finalPath, markdown, 'utf-8');

  return finalPath;
}
