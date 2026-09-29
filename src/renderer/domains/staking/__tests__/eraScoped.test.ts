import { describe, expect, it } from 'vitest';

import { type ChainId } from '@/shared/core';
import { type EraScopedCache, readEraScoped, writeEraScoped } from '../era-scoped';

const CHAIN = '0x01' as ChainId;
const OTHER_CHAIN = '0x02' as ChainId;

describe('readEraScoped', () => {
  it('serves the value computed for the requested era', () => {
    expect(readEraScoped({ era: 10, value: 'apy' }, 10)).toBe('apy');
  });

  it('keeps a falsy value computed for the requested era', () => {
    expect(readEraScoped({ era: 10, value: null }, 10)).toBeNull();
  });

  it('treats a value from another era as not loaded', () => {
    expect(readEraScoped({ era: 10, value: 'apy' }, 11)).toBeUndefined();
    expect(readEraScoped({ era: 11, value: 'apy' }, 10)).toBeUndefined();
  });

  it('treats an unknown era or a missing entry as not loaded', () => {
    expect(readEraScoped({ era: 10, value: 'apy' }, null)).toBeUndefined();
    expect(readEraScoped({ era: 10, value: 'apy' }, undefined)).toBeUndefined();
    expect(readEraScoped(undefined, 10)).toBeUndefined();
  });
});

describe('writeEraScoped', () => {
  it('stores the value together with its era, one entry per chain', () => {
    const cache = writeEraScoped<string>({}, CHAIN, 10, 'a');

    expect(writeEraScoped(cache, OTHER_CHAIN, 3, 'b')).toEqual({
      [CHAIN]: { era: 10, value: 'a' },
      [OTHER_CHAIN]: { era: 3, value: 'b' },
    });
  });

  it('replaces the previous era of the chain with the next one', () => {
    const cache: EraScopedCache<string> = { [CHAIN]: { era: 10, value: 'old' } };

    expect(writeEraScoped(cache, CHAIN, 11, 'new')).toEqual({ [CHAIN]: { era: 11, value: 'new' } });
  });

  it('ignores a late answer for an older era', () => {
    const cache: EraScopedCache<string> = { [CHAIN]: { era: 11, value: 'new' } };

    expect(writeEraScoped(cache, CHAIN, 10, 'old')).toBe(cache);
  });
});
