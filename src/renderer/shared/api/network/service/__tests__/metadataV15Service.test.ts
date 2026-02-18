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

const DECODED_HEX = u8aToHex(METADATA_MAGIC);
const RAW_HEX = buildRawV15ResponseHex(METADATA_MAGIC);

const CHAIN_ID = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
const RUNTIME_VERSION = 1001002;

vi.mock('@/shared/api/storage', () => ({
  storageService: {
    metadata: {
      readAll: vi.fn().mockResolvedValue([]),
    },
  },
}));

const { storageService } = await import('@/shared/api/storage');

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
});
