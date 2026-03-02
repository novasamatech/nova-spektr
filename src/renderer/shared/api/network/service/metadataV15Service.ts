import { type ApiPromise } from '@polkadot/api';
import { compactStripLength, hexToU8a, u8aToHex } from '@polkadot/util';

import { storageService } from '@/shared/api/storage';
import { type ChainId, type HexString } from '@/shared/core';

const METADATA_V15 = 15;
const METADATA_V15_SCALE_ENCODED = '0x0f000000';
const OPTION_SOME_BYTE = 0x01;

const decodedV15Cache = new Map<string, HexString>();
const pendingFetches = new Map<string, Promise<HexString>>();

/**
 * Service for fetching and caching decoded metadata v15 (inner bytes, no Option
 * wrapper). Uses in-memory cache, DB cache, and RPC fetch in that order.
 */
export const metadataV15Service = {
  getDecodedMetadataV15,
  ensureFreshMetadata,
  _clearCache: () => decodedV15Cache.clear(),
};

function cacheKey(chainId: ChainId, runtimeVersion: number): string {
  return `${chainId}:${runtimeVersion}`;
}

/** Detects RPC response in raw Option-wrapped form (starts with 0x01). */
function isRawV15Response(hex: HexString): boolean {
  return hex.startsWith(`0x0${OPTION_SOME_BYTE.toString(16)}`);
}

/** Strips Option wrapper and compact length from raw RPC response. */
function decodeRawV15Response(rawHex: HexString): HexString {
  const u8a = hexToU8a(rawHex);

  if (u8a[0] !== OPTION_SOME_BYTE) {
    throw new Error('[metadataV15Service] Chain does not support metadata v15');
  }

  const [, metadataBytes] = compactStripLength(u8a.slice(1));

  return u8aToHex(metadataBytes);
}

function ensureDecodedV15(hex: HexString): HexString {
  if (isRawV15Response(hex)) {
    return decodeRawV15Response(hex);
  }

  return hex;
}

async function fetchFromRpc(api: ApiPromise): Promise<HexString> {
  const v15Response = await api.rpc.state.call('Metadata_metadata_at_version', METADATA_V15_SCALE_ENCODED);
  const responseHex = u8aToHex(v15Response.toU8a(true));

  return decodeRawV15Response(responseHex as HexString);
}

/**
 * Returns decoded metadata v15 hex for the given API. Resolves from in-memory
 * cache, DB cache, or RPC in that order.
 *
 * @param api - Polkadot API instance
 *
 * @returns Hex string of decoded metadata v15 (inner bytes, no Option wrapper)
 */
async function getDecodedMetadataV15(api: ApiPromise): Promise<HexString> {
  const chainId = api.genesisHash.toHex() as ChainId;
  const runtimeVersion = api.runtimeVersion.specVersion.toNumber();
  const key = cacheKey(chainId, runtimeVersion);

  const memCached = decodedV15Cache.get(key);
  if (memCached) {
    return memCached;
  }

  const pending = pendingFetches.get(key);
  if (pending) {
    return pending;
  }

  const fetchPromise = resolveMetadataV15(api, chainId, runtimeVersion, key);
  pendingFetches.set(key, fetchPromise);

  try {
    return await fetchPromise;
  } finally {
    pendingFetches.delete(key);
  }
}

/**
 * Checks if the API's cached runtime version matches the on-chain version. If
 * stale, clears in-memory metadata cache for that chain so the next
 * getDecodedMetadataV15 call fetches fresh metadata from RPC.
 */
async function ensureFreshMetadata(api: ApiPromise): Promise<void> {
  const chainId = api.genesisHash.toHex() as ChainId;
  const cachedVersion = api.runtimeVersion.specVersion.toNumber();

  const onChainVersion = await api.rpc.state.getRuntimeVersion();
  const actualVersion = onChainVersion.specVersion.toNumber();

  if (cachedVersion !== actualVersion) {
    const staleKey = cacheKey(chainId, cachedVersion);
    decodedV15Cache.delete(staleKey);
    pendingFetches.delete(staleKey);
  }
}

async function resolveMetadataV15(
  api: ApiPromise,
  chainId: ChainId,
  runtimeVersion: number,
  key: string,
): Promise<HexString> {
  const allMetadata = await storageService.metadata.readAll();
  const dbEntry = allMetadata.find(
    (m) => m.chainId === chainId && m.runtimeVersion === runtimeVersion && m.metadataVersion === METADATA_V15,
  );

  if (dbEntry) {
    const decoded = ensureDecodedV15(dbEntry.metadata);
    decodedV15Cache.set(key, decoded);

    return decoded;
  }

  const decoded = await fetchFromRpc(api);
  decodedV15Cache.set(key, decoded);

  return decoded;
}
