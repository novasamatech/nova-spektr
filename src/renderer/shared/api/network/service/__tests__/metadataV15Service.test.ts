import { type ApiPromise } from '@polkadot/api';
import { compactAddLength, u8aToHex } from '@polkadot/util';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { metadataV15Service } from '../metadataV15Service';

// "meta" magic prefix in bytes, used as a recognizable decoded metadata payload
const METADATA_MAGIC = new Uint8Array([0x6d, 0x65, 0x74, 0x61, 0x01, 0x02, 0x03]);

function buildRawV15Response(metadataBytes: Uint8Array): Uint8Array {
  // Option<OpaqueMetadata>: 0x01 (Some) + compact-length-prefixed metadata
  const withCompactLength = compactAddLength(metadataBytes);

  return new Uint8Array([0x01, ...withCompactLength]);
}

function buildRawV15ResponseHex(metadataBytes: Uint8Array): `0x${string}` {
  return u8aToHex(buildRawV15Response(metadataBytes));
}

// A distinct "meta" payload used to represent metadata bytes that decode to a
// different spec version than the row/runtime they are labeled with.
const POISONED_MAGIC = new Uint8Array([0x6d, 0x65, 0x74, 0x61, 0x09, 0x08, 0x07]);

const DECODED_HEX = u8aToHex(METADATA_MAGIC);
const RAW_HEX = buildRawV15ResponseHex(METADATA_MAGIC);
const POISONED_HEX = u8aToHex(POISONED_MAGIC);

const CHAIN_ID = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
const RUNTIME_VERSION = 1001002;
const WRONG_SPEC_VERSION = 999999;

vi.mock('@/shared/api/storage', () => ({
  storageService: {
    metadata: {
      readAll: vi.fn().mockResolvedValue([]),
      deleteAll: vi.fn().mockResolvedValue([]),
    },
  },
}));

// readSpecVersion is verified against a real metadata fixture in its own test; here
// map the synthetic byte payloads to spec versions so the validation path is testable.
vi.mock('@/shared/lib/utils', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;

  return {
    ...actual,
    readSpecVersion: vi.fn((hex: string) => (hex === POISONED_HEX ? WRONG_SPEC_VERSION : RUNTIME_VERSION)),
  };
});

const { storageService } = await import('@/shared/api/storage');
const { readSpecVersion } = await import('@/shared/lib/utils');

function createMockApi(overrides?: {
  chainId?: string;
  runtimeVersion?: number;
  stateCallResponse?: Uint8Array;
}): ApiPromise {
  const chainId = overrides?.chainId ?? CHAIN_ID;
  const runtimeVersion = overrides?.runtimeVersion ?? RUNTIME_VERSION;
  const stateCallResponse = overrides?.stateCallResponse ?? buildRawV15Response(METADATA_MAGIC);

  return {
    genesisHash: {
      toHex: () => chainId,
    },
    runtimeVersion: {
      specVersion: {
        toNumber: () => runtimeVersion,
      },
    },
    rpc: {
      state: {
        call: vi.fn().mockResolvedValue({
          toU8a: () => stateCallResponse,
        }),
      },
    },
  } as unknown as ApiPromise;
}

describe('metadataV15Service', () => {
  afterEach(() => {
    metadataV15Service._clearCache();
    vi.mocked(storageService.metadata.readAll).mockResolvedValue([]);
    vi.mocked(storageService.metadata.deleteAll).mockClear();
    vi.mocked(readSpecVersion).mockImplementation((hex: string) =>
      hex === POISONED_HEX ? WRONG_SPEC_VERSION : RUNTIME_VERSION,
    );
  });

  it('should fetch and decode v15 metadata from RPC on first call', async () => {
    const api = createMockApi();
    const result = await metadataV15Service.getDecodedMetadataV15(api);

    expect(result).toBe(DECODED_HEX);
    expect(api.rpc.state.call).toHaveBeenCalledWith('Metadata_metadata_at_version', '0x0f000000');
  });

  it('should return from in-memory cache on repeated calls without RPC', async () => {
    const api = createMockApi();

    const first = await metadataV15Service.getDecodedMetadataV15(api);
    const second = await metadataV15Service.getDecodedMetadataV15(api);

    expect(first).toBe(second);
    expect(api.rpc.state.call).toHaveBeenCalledTimes(1);
  });

  it('should decode raw v15 metadata from DB cache', async () => {
    vi.mocked(storageService.metadata.readAll).mockResolvedValue([
      {
        id: 1,
        chainId: CHAIN_ID as `0x${string}`,
        runtimeVersion: RUNTIME_VERSION,
        metadataVersion: 15,
        metadata: RAW_HEX,
      },
    ]);

    const api = createMockApi();
    const result = await metadataV15Service.getDecodedMetadataV15(api);

    expect(result).toBe(DECODED_HEX);
    expect(api.rpc.state.call).not.toHaveBeenCalled();
  });

  it('should return already-decoded metadata from DB without re-decoding', async () => {
    vi.mocked(storageService.metadata.readAll).mockResolvedValue([
      {
        id: 1,
        chainId: CHAIN_ID as `0x${string}`,
        runtimeVersion: RUNTIME_VERSION,
        metadataVersion: 15,
        metadata: DECODED_HEX,
      },
    ]);

    const api = createMockApi();
    const result = await metadataV15Service.getDecodedMetadataV15(api);

    expect(result).toBe(DECODED_HEX);
    expect(api.rpc.state.call).not.toHaveBeenCalled();
  });

  it('should throw when chain does not support v15 (Option None)', async () => {
    const noneResponse = new Uint8Array([0x00]);
    const api = createMockApi({ stateCallResponse: noneResponse });

    await expect(metadataV15Service.getDecodedMetadataV15(api)).rejects.toThrow('Chain does not support metadata v15');
  });

  it('should cache different chains independently', async () => {
    const polkadotApi = createMockApi({ chainId: '0xaaa' });
    const kusamaApi = createMockApi({ chainId: '0xbbb' });

    await metadataV15Service.getDecodedMetadataV15(polkadotApi);
    await metadataV15Service.getDecodedMetadataV15(kusamaApi);

    expect(polkadotApi.rpc.state.call).toHaveBeenCalledTimes(1);
    expect(kusamaApi.rpc.state.call).toHaveBeenCalledTimes(1);
  });

  it('should cache different runtime versions independently', async () => {
    const v1Api = createMockApi({ runtimeVersion: 1001000 });
    const v2Api = createMockApi({ runtimeVersion: 1001001 });

    // The synthetic fixture returns identical bytes for both apis; make the decoded
    // spec version match each api's runtime version so validation passes.
    vi.mocked(readSpecVersion).mockReturnValueOnce(1001000).mockReturnValueOnce(1001001);

    await metadataV15Service.getDecodedMetadataV15(v1Api);
    await metadataV15Service.getDecodedMetadataV15(v2Api);

    expect(v1Api.rpc.state.call).toHaveBeenCalledTimes(1);
    expect(v2Api.rpc.state.call).toHaveBeenCalledTimes(1);
  });

  it('should deduplicate concurrent requests for the same chain', async () => {
    const api = createMockApi();

    const [result1, result2] = await Promise.all([
      metadataV15Service.getDecodedMetadataV15(api),
      metadataV15Service.getDecodedMetadataV15(api),
    ]);

    expect(result1).toBe(DECODED_HEX);
    expect(result2).toBe(DECODED_HEX);
    expect(api.rpc.state.call).toHaveBeenCalledTimes(1);
  });

  it('should skip DB entries with wrong metadataVersion', async () => {
    vi.mocked(storageService.metadata.readAll).mockResolvedValue([
      {
        id: 1,
        chainId: CHAIN_ID as `0x${string}`,
        runtimeVersion: RUNTIME_VERSION,
        metadataVersion: 14,
        metadata: '0xdeadbeef' as `0x${string}`,
      },
    ]);

    const api = createMockApi();
    await metadataV15Service.getDecodedMetadataV15(api);

    expect(api.rpc.state.call).toHaveBeenCalledTimes(1);
  });

  it('should skip DB entries with wrong runtimeVersion', async () => {
    vi.mocked(storageService.metadata.readAll).mockResolvedValue([
      {
        id: 1,
        chainId: CHAIN_ID as `0x${string}`,
        runtimeVersion: 999999,
        metadataVersion: 15,
        metadata: RAW_HEX,
      },
    ]);

    const api = createMockApi();
    await metadataV15Service.getDecodedMetadataV15(api);

    expect(api.rpc.state.call).toHaveBeenCalledTimes(1);
  });

  it('should evict a DB entry whose bytes decode to a different spec and refetch from RPC', async () => {
    // Row is labeled with the current runtime version, but its bytes are stale.
    vi.mocked(storageService.metadata.readAll).mockResolvedValue([
      {
        id: 7,
        chainId: CHAIN_ID as `0x${string}`,
        runtimeVersion: RUNTIME_VERSION,
        metadataVersion: 15,
        metadata: POISONED_HEX as `0x${string}`,
      },
    ]);

    const api = createMockApi();
    const result = await metadataV15Service.getDecodedMetadataV15(api);

    expect(storageService.metadata.deleteAll).toHaveBeenCalledWith([7]);
    expect(api.rpc.state.call).toHaveBeenCalledTimes(1);
    expect(result).toBe(DECODED_HEX);
  });

  it('should evict every mislabeled DB entry for the runtime version, not just the first', async () => {
    vi.mocked(storageService.metadata.readAll).mockResolvedValue([
      {
        id: 7,
        chainId: CHAIN_ID as `0x${string}`,
        runtimeVersion: RUNTIME_VERSION,
        metadataVersion: 15,
        metadata: POISONED_HEX as `0x${string}`,
      },
      {
        id: 8,
        chainId: CHAIN_ID as `0x${string}`,
        runtimeVersion: RUNTIME_VERSION,
        metadataVersion: 15,
        metadata: POISONED_HEX as `0x${string}`,
      },
    ]);

    const api = createMockApi();
    const result = await metadataV15Service.getDecodedMetadataV15(api);

    expect(storageService.metadata.deleteAll).toHaveBeenCalledWith([7, 8]);
    expect(result).toBe(DECODED_HEX);
  });

  it('should throw when freshly fetched metadata does not match the runtime version', async () => {
    vi.mocked(readSpecVersion).mockReturnValue(WRONG_SPEC_VERSION);

    const api = createMockApi();

    await expect(metadataV15Service.getDecodedMetadataV15(api)).rejects.toThrow(/spec/i);
  });
});
