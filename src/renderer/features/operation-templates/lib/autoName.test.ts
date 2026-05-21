import { type ApiPromise } from '@polkadot/api';
import { describe, expect, it, vi } from 'vitest';

import { generateTemplateName } from './autoName';

const mockApi = (overrides: Partial<{ section: string; method: string }> = {}, throws = false): ApiPromise => {
  return {
    createType: vi.fn().mockImplementation(() => {
      if (throws) throw new Error('decode failed');
      return { callIndex: new Uint8Array([0, 0]) };
    }),
    registry: {
      findMetaCall: vi.fn().mockReturnValue({
        section: overrides.section ?? 'balances',
        method: overrides.method ?? 'transferKeepAlive',
      }),
    },
  } as unknown as ApiPromise;
};

describe('generateTemplateName', () => {
  it('returns fallback when api is null', () => {
    expect(generateTemplateName(null, '0xab')).toBe('Untitled template');
  });

  it('returns fallback when callData has no 0x prefix', () => {
    expect(generateTemplateName(mockApi(), 'ab')).toBe('Untitled template');
  });

  it('humanises camelCase pallet and method', () => {
    const api = mockApi({ section: 'balances', method: 'transferKeepAlive' });
    expect(generateTemplateName(api, '0xab')).toBe('Balances: Transfer Keep Alive');
  });

  it('humanises snake_case parts', () => {
    const api = mockApi({ section: 'asset_conversion', method: 'add_liquidity' });
    expect(generateTemplateName(api, '0xab')).toBe('Asset Conversion: Add Liquidity');
  });

  it('returns fallback when decoding throws', () => {
    const api = mockApi({}, true);
    expect(generateTemplateName(api, '0xdeadbeef')).toBe('Untitled template');
  });
});
