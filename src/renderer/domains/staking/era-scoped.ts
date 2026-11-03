import { type ChainId, type EraIndex } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';

/**
 * A per-chain cache entry that remembers the era it was computed for.
 *
 * Era-keyed resources request by `(chain, era)` but keep one entry per chain,
 * so memory stays O(chains). The era travels with the value so a reader can
 * tell "the answer for this era" from "the answer for the previous one".
 */
export type EraScoped<T> = {
  era: EraIndex;
  value: T;
};

export type EraScopedCache<T> = Record<ChainId, EraScoped<T>>;

/**
 * The cached value only when it was computed for exactly `era`. Anything else —
 * no entry, another era, no known era — reads as "not loaded yet".
 */
export function readEraScoped<T>(entry: EraScoped<T> | undefined, era: EraIndex | null | undefined): T | undefined {
  if (nullable(entry) || nullable(era) || entry.era !== era) return undefined;

  return entry.value;
}

/**
 * Stores `value` for `(chainId, era)`. A late answer for an older era never
 * replaces a newer one: the newer era's response is already memoised by the
 * request cache and would not be pushed again.
 */
export function writeEraScoped<T>(
  cache: EraScopedCache<T>,
  chainId: ChainId,
  era: EraIndex,
  value: T,
): EraScopedCache<T> {
  const current = cache[chainId];
  if (current && current.era > era) return cache;

  return { ...cache, [chainId]: { era, value } };
}
