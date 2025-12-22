import { Builder, Native, getSupportedDestinations } from '@paraspell/sdk-pjs';
import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { BN } from '@polkadot/util';

import { type Asset, AssetType, type Chain, type ChainId } from '@/shared/core';
import { CHAIN_ID_TO_SPELL_NAME_MAP, isEthereumAccountId, nonNullable, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import {
  XCM_DESTINATION_BLACKLIST,
  XCM_DESTINATION_WHITELIST_LEGACY,
  type XcmDestinationBlacklistEntry,
  type XcmDestinationWhitelistEntry,
  getXcmWhitelist,
} from './constants';
import { normalizeXcmError } from './xcm-error-utils';

type XcmTransferParams = {
  fromChain: Chain;
  toChain: Chain;
  asset: Asset;
  amount: string;
  destinationAddress: string;
  senderAddress?: string;
  fromChainApi: ApiPromise;
  toChainApi: ApiPromise;
  hopApiOverrides?: Record<string, ApiPromise>;
  onDryRunResult?: (result: DryRunResult) => void;
};

type XcmFeeParams = {
  fromChain: Chain;
  toChain: Chain;
  asset: Asset;
  amount: string;
  destinationAddress: string;
  senderAddress?: string;
  fromChainApi: ApiPromise;
  toChainApi: ApiPromise;
  hopApiOverrides?: Record<string, ApiPromise>;
};

type XcmFeeResult = {
  originFee: BN;
  destinationFee: BN | null;
};

type XcmTransferResult = {
  extrinsic: SubmittableExtrinsic<'promise'>;
};

type BuilderResult = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder: any;
  fromChainName: string;
  toChainName: string;
};

type BuilderConfig = {
  abstractDecimals: boolean;
  apiOverrides: Record<string, ApiPromise>;
};

type DryRunResult = {
  hops?: { chain?: string | unknown }[];
  destination?: { success: boolean; failureReason?: string; failureSubReason?: string };
  failureChain?: string;
  failureReason?: string;
  failureSubReason?: string;
  origin?: { success: boolean; fee?: bigint; currency?: string; asset?: unknown; weight?: unknown };
  bridgeHub?: { success: boolean; fee?: bigint; currency?: string; asset?: unknown; weight?: unknown };
  assetHub?: { success: boolean; fee?: bigint; currency?: string; asset?: unknown; weight?: unknown };
};

type DetectHopChainsParams = {
  fromChain: Chain;
  toChain: Chain;
  asset: Asset;
  testDestinationAddress: string;
  testSenderAddress?: string;
  fromChainApi: ApiPromise;
  toChainApi: ApiPromise;
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
};

type DetectHopChainsResult = {
  hopApiOverrides: Record<string, ApiPromise>;
  dryRunResult: DryRunResult;
};

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

let cachedWhitelistEntries: XcmDestinationWhitelistEntry[] | null = null;
let whitelistLoadingPromise: Promise<XcmDestinationWhitelistEntry[]> | null = null;

/**
 * Gets whitelist entries, loading from nova-utils if not already cached
 */
async function getWhitelistEntries(chains: Chain[]): Promise<XcmDestinationWhitelistEntry[]> {
  if (cachedWhitelistEntries) {
    return cachedWhitelistEntries;
  }

  if (whitelistLoadingPromise) {
    return whitelistLoadingPromise;
  }

  whitelistLoadingPromise = getXcmWhitelist(chains).then((entries) => {
    cachedWhitelistEntries = entries;
    whitelistLoadingPromise = null;
    return entries;
  });

  return whitelistLoadingPromise;
}

/**
 * Synchronous version that uses cached whitelist or falls back to legacy
 */
function getWhitelistEntriesSync(): XcmDestinationWhitelistEntry[] {
  if (cachedWhitelistEntries) {
    return cachedWhitelistEntries;
  }
  // Fallback to legacy whitelist if nova-utils hasn't loaded yet
  return XCM_DESTINATION_WHITELIST_LEGACY;
}

function isRouteWhitelisted(
  sourceChainId: ChainId,
  destinationChainId: ChainId,
  sourceAssetSymbol?: string,
  destinationAssetSymbol?: string,
  whitelistEntries?: XcmDestinationWhitelistEntry[],
): boolean {
  const entries = whitelistEntries || getWhitelistEntriesSync();

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

    if (destinationAssetSymbol && entry.destinationAsset && entry.destinationAsset !== destinationAssetSymbol) {
      return false;
    }

    return true;
  });
}

function getSpellChainName(chain: Chain): string | null {
  return CHAIN_ID_TO_SPELL_NAME_MAP[chain.chainId] ?? null;
}

function getChainIdBySpellName(spellChainName: string): ChainId | null {
  const entry = Object.entries(CHAIN_ID_TO_SPELL_NAME_MAP).find(([, name]) => name === spellChainName);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return entry ? (entry[0] as any as ChainId) : null;
}

function extractHopChainNames(
  dryRunResult: DryRunResult | null | undefined,
  fromChainName: string,
  toChainName: string,
): string[] {
  if (!dryRunResult?.hops || !Array.isArray(dryRunResult.hops)) {
    return [];
  }

  const hopChainNames = new Set<string>();

  for (const hop of dryRunResult.hops) {
    if (hop?.chain && typeof hop.chain === 'string') {
      const hopChainName = hop.chain;
      if (hopChainName !== fromChainName && hopChainName !== toChainName) {
        hopChainNames.add(hopChainName);
      }
    }
  }

  return Array.from(hopChainNames);
}

function getHopApiOverrides(
  hopChainNames: string[],
  chains: Record<ChainId, Chain>,
  apis: Record<ChainId, ApiPromise>,
): Record<string, ApiPromise> {
  if (hopChainNames.length === 0) {
    return {};
  }

  const overrides: Record<string, ApiPromise> = {};

  for (const hopChainName of hopChainNames) {
    const hopChainId = getChainIdBySpellName(hopChainName);
    if (hopChainId && chains[hopChainId] && apis[hopChainId]) {
      overrides[hopChainName] = apis[hopChainId];
    } else {
      console.warn('getHopApiOverrides: could not find API for hop chain', {
        hopChainName,
        hopChainId,
        hasChain: hopChainId ? !!chains[hopChainId] : false,
        hasApi: hopChainId ? !!apis[hopChainId] : false,
      });
    }
  }

  return overrides;
}

function convertAddressToChainFormat(accountId: AccountId, targetChain: Chain, _targetChainName: string): string {
  if (isEthereumAccountId(accountId)) {
    return accountId.toString();
  }

  return toAddress(accountId, { prefix: targetChain.addressPrefix });
}

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

function createBuilderConfig(
  fromChain: Chain,
  toChain: Chain,
  fromChainApi: ApiPromise,
  toChainApi: ApiPromise,
  hopApiOverrides?: Record<string, ApiPromise>,
): BuilderConfig {
  const fromChainName = getSpellChainName(fromChain);
  const toChainName = getSpellChainName(toChain);

  if (!fromChainName) {
    throw new Error(
      `spellXcmService: Unsupported origin chain: ${fromChain.name} (chainId: ${fromChain.chainId}). Please add mapping in CHAIN_ID_TO_SPELL_NAME_MAP.`,
    );
  }

  if (!toChainName) {
    throw new Error(
      `spellXcmService: Unsupported destination chain: ${toChain.name} (chainId: ${toChain.chainId}). Please add mapping in CHAIN_ID_TO_SPELL_NAME_MAP.`,
    );
  }

  const apiOverrides = {
    [fromChainName]: fromChainApi,
    [toChainName]: toChainApi,
    ...hopApiOverrides,
  };

  return {
    abstractDecimals: true,
    apiOverrides,
  };
}

function buildXcmTransferBuilder(
  params: XcmTransferParams | XcmFeeParams,
  hopApiOverrides?: Record<string, ApiPromise>,
): BuilderResult | null {
  const { fromChain, toChain, asset, amount, destinationAddress, senderAddress, fromChainApi, toChainApi } = params;

  const fromChainName = getSpellChainName(fromChain);
  const toChainName = getSpellChainName(toChain);

  if (!fromChainName || !toChainName) {
    return null;
  }

  const finalHopOverrides = hopApiOverrides ?? ('hopApiOverrides' in params ? params.hopApiOverrides : undefined);
  const builderConfig = createBuilderConfig(fromChain, toChain, fromChainApi, toChainApi, finalHopOverrides);
  const currencyInput = createCurrencyInput(asset, amount);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let builder: any = Builder(builderConfig)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from(fromChainName as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .to(toChainName as any)
    .currency(currencyInput)
    .address(destinationAddress);

  if (senderAddress) {
    builder = builder.senderAddress(senderAddress);
  }

  return {
    builder,
    fromChainName,
    toChainName,
  };
}

async function detectHopChains(params: DetectHopChainsParams): Promise<DetectHopChainsResult> {
  const {
    fromChain,
    toChain,
    asset,
    testDestinationAddress,
    testSenderAddress,
    fromChainApi,
    toChainApi,
    chains,
    apis,
  } = params;

  const fromChainName = getSpellChainName(fromChain);
  const toChainName = getSpellChainName(toChain);

  if (!fromChainName || !toChainName) {
    throw new Error(
      `spellXcmService: detectHopChains failed - unsupported chains: ${fromChain.name} -> ${toChain.name}`,
    );
  }

  const testAmount = '1';
  const testParams: XcmTransferParams = {
    fromChain,
    toChain,
    asset,
    amount: testAmount,
    destinationAddress: testDestinationAddress,
    senderAddress: testSenderAddress,
    fromChainApi,
    toChainApi,
  };

  const builderResult = buildXcmTransferBuilder(testParams);

  if (!builderResult) {
    throw new Error(`spellXcmService: detectHopChains failed to build builder`);
  }

  const { builder, fromChainName: builderFromName, toChainName: builderToName } = builderResult;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawDryRunResult = await builder.dryRun();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dryRunResult = rawDryRunResult as any as DryRunResult;

    const hasDestinationFailure = dryRunResult.destination && dryRunResult.destination.success === false;
    const hasFailureChain = Boolean(dryRunResult.failureChain);
    const hasFailureReason = Boolean(dryRunResult.destination?.failureReason);
    const originSuccess = dryRunResult.origin?.success === true;

    const isFailure = hasDestinationFailure || hasFailureChain || hasFailureReason;

    if (isFailure) {
      const error = normalizeXcmError(
        dryRunResult.destination?.failureReason,
        dryRunResult.destination?.failureSubReason,
      );
      console.warn('detectHopChains: dry run failed', {
        failureReason: error,
        failureChain: dryRunResult.failureChain,
        hasDestinationFailure,
        hasFailureChain,
        hasFailureReason,
        originSuccess,
      });
      return {
        hopApiOverrides: {},
        dryRunResult,
      };
    }

    if (!originSuccess && !dryRunResult.destination) {
      console.warn('detectHopChains: dry run result missing success indicators', {
        hasOrigin: Boolean(dryRunResult.origin),
        hasDestination: Boolean(dryRunResult.destination),
        originSuccess,
      });
    }

    const hopChainNames = extractHopChainNames(dryRunResult, builderFromName, builderToName);

    const hopApiOverrides = getHopApiOverrides(hopChainNames, chains, apis);

    return {
      hopApiOverrides,
      dryRunResult,
    };
  } catch (error) {
    console.error('detectHopChains: dry run error', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function getXcmFees(params: XcmFeeParams, abortSignal?: AbortSignal): Promise<XcmFeeResult | null> {
  if (abortSignal?.aborted) {
    return null;
  }

  const builderResult = buildXcmTransferBuilder(params, params.hopApiOverrides);

  if (!builderResult) {
    return null;
  }

  const { builder } = builderResult;

  try {
    if (abortSignal?.aborted) {
      return null;
    }

    const feeResult = await builder.getXcmFee({ disableFallback: false });

    if (abortSignal?.aborted) {
      return null;
    }

    const originFee = new BN(String(feeResult.origin.fee));
    const destinationFee = feeResult.destination?.fee ? new BN(String(feeResult.destination.fee)) : null;

    return {
      originFee,
      destinationFee,
    };
  } catch {
    return null;
  }
}

async function buildTransfer(params: XcmTransferParams): Promise<XcmTransferResult> {
  const builderResult = buildXcmTransferBuilder(params, params.hopApiOverrides);

  if (!builderResult) {
    const { fromChain, toChain } = params;
    throw new Error(
      `spellXcmService: buildTransfer failed for chains: ${fromChain.name}, ${toChain.name} (chainId: ${fromChain.chainId}) -> ${toChain.chainId}). Please add mapping in CHAIN_ID_TO_SPELL_NAME_MAP.`,
    );
  }

  const { builder } = builderResult;

  let dryRunResult: DryRunResult | undefined;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawDryRunResult = await builder.dryRun();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dryRunResult = rawDryRunResult as any as DryRunResult;

    if (params.onDryRunResult) {
      params.onDryRunResult(dryRunResult);
    }

    const hasFailureReason = Boolean(dryRunResult.failureReason);
    const hasFailureChain = Boolean(dryRunResult.failureChain);
    const hasDestinationFailure = dryRunResult.destination?.success === false;

    if (hasFailureReason || hasFailureChain || hasDestinationFailure) {
      const error =
        normalizeXcmError(
          dryRunResult.failureReason || dryRunResult.destination?.failureReason,
          dryRunResult.failureSubReason || dryRunResult.destination?.failureSubReason,
        ) || 'Dry run failed';
      const isDryRunApiUnavailable = error.toLowerCase().includes('dryrunapi is not available');
      const isFeesNotMet = error === 'FeesNotMet';
      const isOriginChainFailure = dryRunResult.failureChain === 'origin';
      const isLikelyOriginFeesNotMet = isFeesNotMet && isOriginChainFailure;

      if (!isDryRunApiUnavailable && !isLikelyOriginFeesNotMet) {
        throw new Error(error);
      }
    }
  } catch (dryRunError) {
    const errorMessage = dryRunError instanceof Error ? dryRunError.message : String(dryRunError);
    const isDryRunApiUnavailable = errorMessage.toLowerCase().includes('dryrunapi is not available');

    if (isDryRunApiUnavailable) {
      return {
        extrinsic: await builder.build(),
      };
    }

    if (params.onDryRunResult) {
      params.onDryRunResult({
        destination: {
          success: false,
          failureReason: errorMessage,
        },
      });
    }

    throw dryRunError;
  }

  const extrinsic = await builder.build();

  return {
    extrinsic,
  };
}

/**
 * Initializes the XCM whitelist by loading it from nova-utils This should be
 * called early in the application lifecycle when chains are available
 *
 * @param chains - Array of all available chains
 */
async function initializeXcmWhitelist(chains: Chain[]): Promise<void> {
  if (cachedWhitelistEntries) {
    return;
  }

  try {
    const entries = await getWhitelistEntries(chains);
    console.log(`✅ XCM whitelist loaded from nova-utils: ${entries.length} entries`);
  } catch (error) {
    console.warn('Failed to initialize XCM whitelist from nova-utils, using legacy whitelist:', error);
  }
}

function getAvailableTransfers(fromChain: Chain, asset: Asset): string[] {
  const fromChainName = getSpellChainName(fromChain);
  if (!fromChainName) {
    return [];
  }

  try {
    const currencyInput = createCurrencyInput(asset, '0');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allDestinations = getSupportedDestinations(fromChainName as any, currencyInput);
    const filteredDestinations = allDestinations.filter((destinationChainName) => {
      const destinationChainId = getChainIdBySpellName(destinationChainName);
      if (!destinationChainId) {
        return false;
      }

      if (isRouteBlacklisted(fromChain.chainId, destinationChainId)) {
        return false;
      }

      // Use cached whitelist synchronously (will fallback to legacy if not loaded yet)
      return isRouteWhitelisted(fromChain.chainId, destinationChainId, asset.symbol);
    });
    return filteredDestinations;
  } catch {
    return [];
  }
}

function prepareAddressForChain(accountId: AccountId, chain: Chain, chainName: string): string {
  return convertAddressToChainFormat(accountId, chain, chainName);
}

export const spellXcmService = {
  buildTransfer,
  getXcmFees,
  getAvailableTransfers,
  getSpellChainName,
  prepareAddressForChain,
  detectHopChains,
  buildXcmTransferBuilder,
  createBuilderConfig,
  initializeXcmWhitelist,
};
