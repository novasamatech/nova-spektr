/**
 * How far an answer assembled from several reads can be trusted.
 *
 * - `complete` — every read answered in full: an empty result really means
 *   "nothing there";
 * - `partial` — what was found is real, but something may be missing (a read
 *   failed, an indexer lags behind or was cut short): a total is a lower
 *   bound;
 * - `unavailable` — nothing could be read; the result says nothing.
 */
export type DataCompleteness = 'complete' | 'partial' | 'unavailable';

/**
 * How long an answer that is not complete is reused. Short on purpose: the next
 * request asks again instead of repeating a failed read for the whole cache
 * window of a complete answer.
 */
export const INCOMPLETE_STALE_AFTER = 30 * 1000;

/**
 * The completeness of a whole made of several answers — reads of one scan, or
 * the scans behind one figure.
 *
 * Nothing to combine is `complete`: there was nothing to ask. Otherwise the
 * whole is `complete` only when every part is, `unavailable` only when every
 * part is, and `partial` in between.
 */
export function combineCompleteness(parts: readonly DataCompleteness[]): DataCompleteness {
  if (parts.every(part => part === 'complete')) return 'complete';
  if (parts.every(part => part === 'unavailable')) return 'unavailable';

  return 'partial';
}
