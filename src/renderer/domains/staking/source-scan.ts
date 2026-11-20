import { z } from 'zod';

import { type DataCompleteness, type ScanRange, type ScanReport, type SourceScan } from './completeness';

/**
 * Reading several indexers and merging what they hold — shared by the payout
 * scan, the era replay and the reward totals, so the three cannot drift apart
 * on what "this source answered" or "these sources agree" means.
 *
 * Domain-internal — not part of the staking public API.
 */

export type SourcePage<T, M> = {
  rows: T[];
  totalCount: number;
  /** What the source says about itself. Taken from the first page only. */
  meta: M;
};

/**
 * The outcome of one source's page walk. Rows exist on a `complete` walk only —
 * there is no partial list to merge by mistake.
 */
export type SourceWalk<T, M> =
  | { status: 'complete'; rows: T[]; meta: M }
  | { status: 'failed' | 'cut-short'; meta: M | null };

/**
 * Pages through one source's list until the count it announced is reached.
 *
 * The rows are collected apart and handed over only when the walk completes. A
 * page that cannot be read, or an empty page before the announced count, fails
 * the walk. The count and what the source says about itself are fixed by the
 * first page: a count that moves while paging means rows were added or removed
 * under the scan, so the pages no longer form one set and the walk is cut short
 * — as it is when it runs into `maxPages`.
 *
 * `requestPage` answers `null` for a page it could not make sense of.
 */
export async function walkSourcePages<T, M>(
  url: string,
  maxPages: number,
  requestPage: (offset: number) => Promise<SourcePage<T, M> | null>,
): Promise<SourceWalk<T, M>> {
  const rows: T[] = [];
  let first: { totalCount: number; meta: M } | null = null;
  let offset = 0;

  for (let page = 0; page < maxPages; page++) {
    let result: SourcePage<T, M> | null;

    try {
      result = await requestPage(offset);
    } catch (error) {
      console.error('Staking: indexer request failed for', url, error);

      return { status: 'failed', meta: first?.meta ?? null };
    }

    if (!result) return { status: 'failed', meta: first?.meta ?? null };

    if (!first) {
      first = { totalCount: result.totalCount, meta: result.meta };
    } else if (result.totalCount !== first.totalCount) {
      return { status: 'cut-short', meta: first.meta };
    }

    rows.push(...result.rows);
    offset += result.rows.length;
    if (offset >= first.totalCount) return { status: 'complete', rows, meta: first.meta };

    if (result.rows.length === 0) {
      console.error('Staking: indexer returned fewer rows than it announced', url);

      return { status: 'failed', meta: first.meta };
    }
  }

  return { status: 'cut-short', meta: first?.meta ?? null };
}

type SourceRead<T, M> = { url: string; walk: SourceWalk<T, M> };

type CompleteRead<T, M> = { url: string; rows: T[]; meta: M };

function pickComplete<T, M>(sources: readonly SourceRead<T, M>[]): CompleteRead<T, M>[] {
  return sources.flatMap(({ url, walk }) =>
    walk.status === 'complete' ? [{ url, rows: walk.rows, meta: walk.meta }] : [],
  );
}

/**
 * One record per identifier out of several lists. A record two lists hold with
 * the same values is kept once; one they hold with different values is a
 * conflict and is left out altogether — no list wins. Every record is compared
 * with the first one seen under its identifier, so the outcome does not depend
 * on the order of the lists.
 */
function mergeRecords<T>(
  lists: readonly (readonly T[])[],
  getKey: (record: T, listIndex: number) => string,
  isSame: (a: T, b: T) => boolean,
): { records: T[]; conflicts: string[] } {
  const merged = new Map<string, T>();
  const conflicts = new Set<string>();

  for (const [listIndex, list] of lists.entries()) {
    for (const record of list) {
      const key = getKey(record, listIndex);
      const known = merged.get(key);

      if (known === undefined) {
        merged.set(key, record);
      } else if (!isSame(known, record)) {
        conflicts.add(key);
      }
    }
  }

  for (const key of conflicts) {
    merged.delete(key);
  }

  return { records: [...merged.values()], conflicts: [...conflicts].sort() };
}

function sortSources(sources: SourceScan[]): SourceScan[] {
  return [...sources].sort((a, b) => a.url.localeCompare(b.url));
}

/** The stretches of `requested` that none of the `held` ranges reaches. */
export function findMissingRanges(requested: ScanRange, held: readonly ScanRange[]): ScanRange[] {
  const missing: ScanRange[] = [];
  let next = requested.from;

  for (const range of [...held].sort((a, b) => a.from - b.from)) {
    if (range.to < next) continue;
    if (range.from > requested.to) break;

    if (range.from > next) {
      missing.push({ from: next, to: range.from - 1 });
    }
    next = range.to + 1;
  }

  if (next <= requested.to) {
    missing.push({ from: next, to: requested.to });
  }

  return missing;
}

/**
 * What an indexer of era exposures says about itself: the oldest and the newest
 * era it holds at all, and the chain it indexes. Asked with every page, next to
 * the rows.
 *
 * The era bounds matter because an indexer answers "no rows" for eras it does
 * not hold, and that answer must not be read as "exposed nowhere".
 */
export const ERA_SOURCE_STATUS = `
    indexedFrom: eraValidatorInfos(first: 1, orderBy: ERA_ASC) {
      nodes {
        era
      }
    }
    indexedTo: eraValidatorInfos(first: 1, orderBy: ERA_DESC) {
      nodes {
        era
      }
    }
    _metadata {
      genesisHash
    }
`;

const eraBoundSchema = z.object({
  nodes: z.array(z.object({ era: z.number().int().nonnegative() })),
});

/**
 * External schema — validated at runtime, never trusted. Extended by each scan
 * with the rows it asks for.
 */
export const eraSourceStatusSchema = z.object({
  indexedFrom: eraBoundSchema,
  indexedTo: eraBoundSchema,
  _metadata: z.object({ genesisHash: z.string().min(1).nullish() }).nullish(),
});

export type EraSourceMeta = {
  chain: string | null;
  /** The eras the source holds, oldest to newest. `null` — it holds none. */
  range: ScanRange | null;
};

export function toEraSourceMeta(status: z.infer<typeof eraSourceStatusSchema>): EraSourceMeta {
  const from = status.indexedFrom.nodes[0]?.era;
  const to = status.indexedTo.nodes[0]?.era;

  return {
    chain: status._metadata?.genesisHash ?? null,
    range: from === undefined || to === undefined ? null : { from, to },
  };
}

type MergedScan<T> = {
  records: T[];
  completeness: DataCompleteness;
  scan: ScanReport;
};

type MergeEraScansParams<T> = {
  sources: readonly SourceRead<T, EraSourceMeta>[];
  /** The era range that was asked for. */
  requested: ScanRange;
  getKey: (record: T) => string;
  isSame: (a: T, b: T) => boolean;
};

/**
 * Era records of several indexers as one answer.
 *
 * A record is identified by its era and validator whichever indexer holds it:
 * the indexers of one request follow the same staking system (before and after
 * it moved chains), and an era is numbered once. Records are therefore merged
 * by identifier and never added up.
 *
 * Only a source whose walk completed is merged. The answer is `complete` when
 * every source is merged, none of them disagree, and the era ranges the merged
 * sources say they hold reach every era that was asked for; whatever they do
 * not reach is listed as `missing`. With no source merged it is `unavailable`.
 */
export function mergeEraScans<T>({ sources, requested, getKey, isSame }: MergeEraScansParams<T>): MergedScan<T> {
  const complete = pickComplete(sources);
  const { records, conflicts } = mergeRecords(
    complete.map(({ rows }) => rows),
    getKey,
    isSame,
  );

  const missing = findMissingRanges(
    requested,
    complete.flatMap(({ meta }) => (meta.range ? [meta.range] : [])),
  );

  const report = sources.map<SourceScan>(({ url, walk }) => ({
    url,
    chain: walk.meta?.chain ?? null,
    status: walk.status,
    merged: walk.status === 'complete',
    range: walk.meta?.range ?? null,
    upToDate: (walk.meta?.range?.to ?? -1) >= requested.to,
  }));

  let completeness: DataCompleteness = 'partial';
  if (complete.length === 0) {
    completeness = 'unavailable';
  } else if (complete.length === sources.length && conflicts.length === 0 && missing.length === 0) {
    completeness = 'complete';
  }

  return { records, completeness, scan: { unit: 'era', sources: sortSources(report), missing, conflicts } };
}

export type ChainSourceMeta = {
  chain: string | null;
  /** The blocks of its chain the source has processed, first to last. */
  range: ScanRange | null;
  /** The source has processed its chain up to the head, recently. */
  upToDate: boolean;
};

type MergeChainScansParams<T> = {
  sources: readonly SourceRead<T, ChainSourceMeta>[];
  /** The record's identifier within its own chain. */
  getId: (record: T) => string;
  isSame: (a: T, b: T) => boolean;
};

/**
 * Reward records of several indexers as one answer whose records can be added
 * up.
 *
 * A reward is an event of exactly one chain, so two sources hold different
 * rewards only when they index different chains — and that is taken from what
 * each source says it indexes, never assumed from its address. A record is
 * identified by its chain and its identifier within that chain: sources of the
 * same chain are copies of one dataset, a record both hold is kept once, and
 * one they hold with different values is a conflict and left out.
 *
 * Only a source whose walk completed is merged. One that does not say which
 * chain it indexes cannot be shown to hold other rewards than the rest, so next
 * to another source it is left out as well; alone, there is nothing for it to
 * overlap with.
 *
 * The answer is `complete` when every source is merged and up to date and none
 * of them disagree. With no source merged it is `unavailable`.
 */
export function mergeChainScans<T>({ sources, getId, isSame }: MergeChainScansParams<T>): MergedScan<T> {
  const complete = pickComplete(sources);
  const merged = complete.length === 1 ? complete : complete.filter(({ meta }) => meta.chain !== null);
  const mergedUrls = new Set(merged.map(({ url }) => url));

  const { records, conflicts } = mergeRecords(
    merged.map(({ rows }) => rows),
    (record, index) => `${merged[index]?.meta.chain ?? ''}:${getId(record)}`,
    isSame,
  );

  const report = sources.map<SourceScan>(({ url, walk }) => ({
    url,
    chain: walk.meta?.chain ?? null,
    status: walk.status,
    merged: mergedUrls.has(url),
    range: walk.meta?.range ?? null,
    upToDate: walk.meta?.upToDate ?? false,
  }));

  let completeness: DataCompleteness = 'partial';
  if (merged.length === 0) {
    completeness = 'unavailable';
  } else if (merged.length === sources.length && conflicts.length === 0 && merged.every(({ meta }) => meta.upToDate)) {
    completeness = 'complete';
  }

  return { records, completeness, scan: { unit: 'block', sources: sortSources(report), missing: [], conflicts } };
}

/** The report of a scan that asked no source. */
export function emptyScan(unit: ScanReport['unit']): ScanReport {
  return { unit, sources: [], missing: [], conflicts: [] };
}
