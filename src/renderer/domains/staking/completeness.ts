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

/**
 * How the page walk of one source ended. Only a `complete` walk hands its rows
 * over; the rows of any other walk are thrown away where they were read.
 *
 * - `complete` — every page was read and the rows add up to the count the source
 *   announced;
 * - `failed` — a page could not be read, or the source delivered fewer rows than
 *   it announced;
 * - `cut-short` — the page limit was reached before the announced count, or the
 *   set changed while it was being read.
 */
export type SourceScanStatus = 'complete' | 'failed' | 'cut-short';

/** A stretch of eras or blocks, inclusive on both ends. */
export type ScanRange = { from: number; to: number };

/** What one source contributed to a merged answer, and what it stands for. */
export type SourceScan = {
  /** The endpoint that was asked. */
  url: string;
  /**
   * Genesis hash of the chain the endpoint says it indexes. `null` — it did not
   * say, or did not answer at all.
   */
  chain: string | null;
  status: SourceScanStatus;
  /**
   * Its rows are part of the merged answer. Never true for a walk that did not
   * complete; a complete one is still left out when nothing proves its rows are
   * not the rows of another source.
   */
  merged: boolean;
  /**
   * What the source says it holds, in the unit of the report: its oldest and
   * newest era, or the first and last block of its chain it has processed.
   * `null` — it did not say, or holds nothing.
   */
  range: ScanRange | null;
  /**
   * The source has reached the end of what was asked: the last era of the
   * range, or the head of its chain.
   */
  upToDate: boolean;
};

/**
 * Where a merged answer came from: every source that was asked, which part of
 * history each one stands for, and what the answer is missing.
 *
 * The same whatever order the sources answered in or were listed in.
 */
export type ScanReport = {
  /** The unit of every range in the report. */
  unit: 'era' | 'block';
  sources: SourceScan[];
  /**
   * Stretches of the requested era range no merged source holds. Always empty
   * for a `block` report: a reward scan is asked by time, so what it is missing
   * is read off the sources — one that is not merged or not up to date.
   */
  missing: ScanRange[];
  /**
   * Identifiers of the records two merged sources hold with different values.
   * None of them is in the answer.
   */
  conflicts: string[];
};
