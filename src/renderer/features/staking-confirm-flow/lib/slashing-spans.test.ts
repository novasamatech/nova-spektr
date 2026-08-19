import { describe, expect, it } from 'vitest';

import { type StakingSlashingSpans } from '@/shared/pallet/staking';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { DEFAULT_SLASHING_SPANS, buildSlashingSpanCounts, resolveSlashingSpanCount } from './slashing-spans';

const accountId = (n: number): AccountId => `0x${n.toString(16).padStart(64, '0')}` as AccountId;

const spans = (prior: number[]): StakingSlashingSpans => ({
  spanIndex: prior.length + 1,
  lastStart: 0,
  lastNonzeroSlash: 0,
  prior,
});

describe('resolveSlashingSpanCount', () => {
  it('counts the current span plus every prior one', () => {
    expect(resolveSlashingSpanCount(spans([7, 4, 1]))).toBe(4);
  });

  it('is one for a stash with a span but nothing prior', () => {
    expect(resolveSlashingSpanCount(spans([]))).toBe(1);
  });

  it('falls back rather than to zero when the stash has no entry', () => {
    expect(resolveSlashingSpanCount(null)).toBe(DEFAULT_SLASHING_SPANS);
    expect(resolveSlashingSpanCount(undefined)).toBe(DEFAULT_SLASHING_SPANS);
    // Zero would be accepted by the runtime, but the floor costs nothing and
    // keeps a value that is never too small.
    expect(DEFAULT_SLASHING_SPANS).toBeGreaterThan(0);
  });
});

describe('buildSlashingSpanCounts', () => {
  it('answers for every requested stash, whatever came back', () => {
    const counts = buildSlashingSpanCounts(
      [accountId(1), accountId(2), accountId(3)],
      [
        { validator: accountId(1), spans: spans([9, 5]) },
        { validator: accountId(2), spans: null },
      ],
    );

    expect(counts).toEqual({
      [accountId(1)]: 3,
      [accountId(2)]: DEFAULT_SLASHING_SPANS,
      // Never read at all — still gets an answer rather than `undefined`.
      [accountId(3)]: DEFAULT_SLASHING_SPANS,
    });
  });

  it('falls back for everyone on a runtime without the storage', () => {
    expect(buildSlashingSpanCounts([accountId(1), accountId(2)], null)).toEqual({
      [accountId(1)]: DEFAULT_SLASHING_SPANS,
      [accountId(2)]: DEFAULT_SLASHING_SPANS,
    });
  });

  it('ignores entries nobody asked about', () => {
    const counts = buildSlashingSpanCounts([accountId(1)], [{ validator: accountId(2), spans: spans([1, 2, 3]) }]);

    expect(counts).toEqual({ [accountId(1)]: DEFAULT_SLASHING_SPANS });
  });
});
