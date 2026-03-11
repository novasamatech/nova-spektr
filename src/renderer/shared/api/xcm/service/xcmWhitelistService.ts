import { type Chain, type ChainId } from '@/shared/core';

import { type XcmDestinationWhitelistEntry } from './constants';

/**
 * Nova Utils XCM transfers JSON structure
 */
type NovaUtilsXcmTransfersJson = {
  assetsLocation: Record<
    string,
    {
      chainId: string;
      multiLocation: Record<string, unknown>;
    }
  >;
  chains: {
    chainId: string;
    assets: {
      assetId: number;
      xcmTransfers: {
        chainId: string;
        assetId: number;
        hasDeliveryFee?: boolean;
        supportsXcmExecute?: boolean;
      }[];
    }[];
  }[];
};

const XCM_TRANSFERS_URL =
  'https://raw.githubusercontent.com/novasamatech/nova-utils/refs/heads/master/xcm/v8/transfers_dynamic.json';

let cachedWhitelist: XcmDestinationWhitelistEntry[] | null = null;
let whitelistPromise: Promise<XcmDestinationWhitelistEntry[]> | null = null;

/**
 * Maps asset ID to asset symbol for a given chain
 */
function getAssetSymbolByAssetId(chain: Chain, assetId: number): string | undefined {
  const asset = chain.assets.find((a) => a.assetId === assetId);
  return asset?.symbol;
}

/**
 * Fetches and parses XCM transfers data from nova-utils repository
 */
async function fetchXcmTransfersData(): Promise<NovaUtilsXcmTransfersJson> {
  const response = await fetch(XCM_TRANSFERS_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch XCM transfers data: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Converts nova-utils XCM transfers JSON to whitelist entries
 */
function convertToWhitelistEntries(
  jsonData: NovaUtilsXcmTransfersJson,
  chains: Chain[],
): XcmDestinationWhitelistEntry[] {
  const whitelistEntries: XcmDestinationWhitelistEntry[] = [];
  const chainMap = new Map<ChainId, Chain>(chains.map((chain) => [chain.chainId, chain]));

  for (const chainData of jsonData.chains) {
    // Ensure chainId has 0x prefix
    const sourceChainIdRaw = chainData.chainId.startsWith('0x') ? chainData.chainId : `0x${chainData.chainId}`;
    const sourceChainId = sourceChainIdRaw as ChainId;
    const sourceChain = chainMap.get(sourceChainId);

    if (!sourceChain) {
      // Skip chains we don't have in our chain data
      continue;
    }

    for (const assetData of chainData.assets) {
      const sourceAssetSymbol = getAssetSymbolByAssetId(sourceChain, assetData.assetId);

      if (!sourceAssetSymbol) {
        // Skip if we can't map the asset ID to a symbol
        continue;
      }

      for (const transfer of assetData.xcmTransfers) {
        // Ensure chainId has 0x prefix
        const destinationChainIdRaw = transfer.chainId.startsWith('0x') ? transfer.chainId : `0x${transfer.chainId}`;
        const destinationChainId = destinationChainIdRaw as ChainId;
        const destinationChain = chainMap.get(destinationChainId);

        if (!destinationChain) {
          // Skip destinations we don't have in our chain data
          continue;
        }

        const destinationAssetSymbol = getAssetSymbolByAssetId(destinationChain, transfer.assetId);

        const entry: XcmDestinationWhitelistEntry = {
          sourceChainId,
          destinationChainId,
          sourceAsset: sourceAssetSymbol,
        };

        // Only add destinationAsset if it's different from source or if it's explicitly specified
        if (destinationAssetSymbol && destinationAssetSymbol !== sourceAssetSymbol) {
          entry.destinationAsset = destinationAssetSymbol;
        }

        whitelistEntries.push(entry);
      }
    }
  }

  return whitelistEntries;
}

/**
 * Loads XCM whitelist from nova-utils repository
 *
 * @param chains - Array of all available chains (used for asset ID to symbol
 *   mapping)
 * @param forceRefresh - If true, bypasses cache and fetches fresh data
 *
 * @returns Promise resolving to array of whitelist entries
 */
export async function loadXcmWhitelistFromNovaUtils(
  chains: Chain[],
  forceRefresh = false,
): Promise<XcmDestinationWhitelistEntry[]> {
  // Return cached data if available and not forcing refresh
  if (cachedWhitelist && !forceRefresh) {
    return cachedWhitelist;
  }

  // Return existing promise if one is in flight
  if (whitelistPromise && !forceRefresh) {
    return whitelistPromise;
  }

  // Create new fetch promise
  whitelistPromise = (async () => {
    try {
      const jsonData = await fetchXcmTransfersData();
      const entries = convertToWhitelistEntries(jsonData, chains);
      cachedWhitelist = entries;
      return entries;
    } catch (error) {
      // Clear promise on error so we can retry
      whitelistPromise = null;
      throw error;
    }
  })();

  return whitelistPromise;
}

/**
 * Clears the cached whitelist
 */
export function clearXcmWhitelistCache(): void {
  cachedWhitelist = null;
  whitelistPromise = null;
}
