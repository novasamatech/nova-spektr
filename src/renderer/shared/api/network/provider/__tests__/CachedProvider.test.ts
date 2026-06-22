import { type ProviderInterface } from '@polkadot/rpc-provider/types';
import { compactAddLength, u8aToHex } from '@polkadot/util';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type ChainMetadata, type HexString } from '@/shared/core';
import { createCachedProvider } from '../CachedProvider';

// Inner metadata bytes ("meta" + 0x0f version marker + a distinguishing byte).
const OLD_INNER = new Uint8Array([0x6d, 0x65, 0x74, 0x61, 0x0f, 0x01]);
const NEW_INNER = new Uint8Array([0x6d, 0x65, 0x74, 0x61, 0x0f, 0x02]);

const OLD_INNER_HEX = u8aToHex(OLD_INNER);
const NEW_INNER_HEX = u8aToHex(NEW_INNER);

const OLD_SPEC = 1003004;
const NEW_SPEC = 2003001;

// Wrap inner bytes the way `Metadata_metadata_at_version` returns them:
// Option<OpaqueMetadata> => 0x01 (Some) + compact-length-prefixed inner bytes.
function buildV15Response(inner: Uint8Array): HexString {
  return u8aToHex(new Uint8Array([0x01, ...compactAddLength(inner)]));
}

const OLD_V15_RESPONSE = buildV15Response(OLD_INNER);
const NEW_V15_RESPONSE = buildV15Response(NEW_INNER);

// readSpecVersion is exercised against a real metadata fixture in its own test; here
// we only verify cache-invalidation, so map inner bytes -> spec version deterministically.
vi.mock('@/shared/lib/utils', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;

  return {
    ...actual,
    readSpecVersion: vi.fn((hex: HexString) => {
      if (hex === OLD_INNER_HEX) return OLD_SPEC;
      if (hex === NEW_INNER_HEX) return NEW_SPEC;
      throw new Error(`unexpected metadata hex in test: ${hex}`);
    }),
  };
});

const STATE_CALL_PARAMS = ['Metadata_metadata_at_version', '0x0f000000'];

class MockProvider {
  liveSpecVersion = NEW_SPEC;
  freshV15Response: HexString = NEW_V15_RESPONSE;

  async send(method: string, params: unknown[]): Promise<unknown> {
    if (method === 'state_getRuntimeVersion') {
      return { specVersion: this.liveSpecVersion };
    }
    if (method === 'state_call' && (params as string[])[0] === 'Metadata_metadata_at_version') {
      return this.freshV15Response;
    }

    return null;
  }
}

function createProvider(seed: Partial<ChainMetadata>) {
  const metadata = {
    id: 1,
    chainId: '0x68d56f15' as `0x${string}`,
    metadataVersion: 15,
    runtimeVersion: NEW_SPEC,
    metadata: OLD_V15_RESPONSE,
    ...seed,
  } as ChainMetadata;

  const CachedProvider = createCachedProvider(MockProvider as unknown as new () => ProviderInterface, metadata);

  return new CachedProvider();
}

function countMetadataFetches(spy: ReturnType<typeof vi.spyOn>): number {
  return spy.mock.calls.filter(
    ([method, params]: [string, unknown]) =>
      method === 'state_call' && (params as string[])?.[0] === 'Metadata_metadata_at_version',
  ).length;
}

describe('CachedProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('refetches v15 metadata when cached bytes are stale despite a matching runtimeVersion label', async () => {
    // The bug: label says 2003001, but the cached bytes decode to 1003004.
    const provider = createProvider({ runtimeVersion: NEW_SPEC, metadata: OLD_V15_RESPONSE, metadataVersion: 15 });
    const baseSend = vi.spyOn(MockProvider.prototype, 'send');

    const result = await provider.send('state_call', STATE_CALL_PARAMS);

    expect(result).toBe(NEW_V15_RESPONSE);
    expect(countMetadataFetches(baseSend)).toBe(1);
  });

  it('serves cached v15 metadata without refetching when the bytes match the live runtime', async () => {
    const provider = createProvider({ runtimeVersion: NEW_SPEC, metadata: NEW_V15_RESPONSE, metadataVersion: 15 });
    const baseSend = vi.spyOn(MockProvider.prototype, 'send');

    const result = await provider.send('state_call', STATE_CALL_PARAMS);

    expect(result).toBe(NEW_V15_RESPONSE);
    expect(countMetadataFetches(baseSend)).toBe(0);
  });
});
