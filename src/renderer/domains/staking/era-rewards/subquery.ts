import { GraphQLClient } from 'graphql-request';
import { isEqual } from 'lodash';
import { z } from 'zod';

import { type EraIndex } from '@/shared/core';
import { nonNullable, toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { exposureKey } from '../exposure-key';
import { type RewardSource } from '../types';

import { type EraExposureShares, type IndexedExposureShares } from './types';

/**
 * Page size of a single indexer request.
 *
 * Smaller than the payout scan's, on purpose: these rows carry the validator's
 * whole nominator list (~10 KB each, far more for a full page), and the only
 * part of it we keep is our own line.
 */
const PAGE_SIZE = 100;
/** Hard stop for pagination. A scan that runs into it is reported as cut short. */
const MAX_PAGES = 60;

/**
 * `indexedTo` is the newest era the indexer holds at all: an indexer that
 * stopped short of the range answers "no rows" for it, and that answer must not
 * be read as "the stashes were exposed nowhere".
 */
const GET_ERA_EXPOSURES = `
  query EraExposures($filters: [EraValidatorInfoFilter!]!, $eraFrom: Int!, $eraTo: Int!, $first: Int!, $offset: Int!) {
    indexedTo: eraValidatorInfos(first: 1, orderBy: ERA_DESC) {
      nodes {
        era
      }
    }
    eraValidatorInfos(
      first: $first
      offset: $offset
      orderBy: ERA_DESC
      filter: {
        era: { greaterThanOrEqualTo: $eraFrom, lessThanOrEqualTo: $eraTo }
        or: $filters
      }
    ) {
      totalCount
      nodes {
        era
        address
        own
        total
        others
      }
    }
  }
`;

/** External schema — validated at runtime, never trusted. */
const balanceSchema = z.union([z.string(), z.number()]).transform(String);

const responseSchema = z.object({
  indexedTo: z.object({
    nodes: z.array(z.object({ era: z.number().int().nonnegative() })),
  }),
  eraValidatorInfos: z.object({
    totalCount: z.number().int().nonnegative(),
    nodes: z.array(
      z.object({
        era: z.number().int().nonnegative(),
        address: z.string().min(1),
        own: balanceSchema,
        total: balanceSchema,
        others: z.array(z.object({ who: z.string().min(1), value: balanceSchema })).nullable(),
      }),
    ),
  }),
});

type Params = {
  rewardSources: RewardSource[];
  stashes: AccountId[];
  eraFrom: EraIndex;
  eraTo: EraIndex;
};

/**
 * One indexer row's slices that belong to our stashes. A stash appears in
 * `others` when it nominates the row's validator — and in `address` when it IS
 * the validator: that line is implicit (`own`), so it has to be added, not
 * found. Missing it is what made every own-validator earn a flat zero.
 */
export function buildShares(
  node: { address: string; own: string; others: { who: string; value: string }[] | null },
  byAddress: Map<string, AccountId>,
): Record<AccountId, string> {
  const shares: Record<AccountId, string> = {};

  for (const other of node.others ?? []) {
    const stash = byAddress.get(other.who);
    if (stash) {
      shares[stash] = other.value;
    }
  }

  const selfStash = byAddress.get(node.address);
  if (selfStash) {
    shares[selfStash] = node.own;
  }

  return shares;
}

/** What one indexer said, kept apart from every other indexer's answer. */
type SourceAnswer = {
  exposures: EraExposureShares[];
  /** Paging reached `totalCount` — nothing of the filtered set was left out. */
  paged: boolean;
  /** The indexer has reached the end of the range. */
  covers: boolean;
};

async function fetchSource(
  { url, addressPrefix }: RewardSource,
  { stashes, eraFrom, eraTo }: Omit<Params, 'rewardSources'>,
): Promise<SourceAnswer | null> {
  try {
    const client = new GraphQLClient(url);
    const addresses = stashes.map(stash => toAddress(stash, { prefix: addressPrefix }));
    const byAddress = new Map<string, AccountId>(addresses.map((address, index) => [address, stashes[index]!]));

    // Nominating and validating are different rows: the stash appears in
    // `others` when it nominates and in `address` when it validates.
    const filters = addresses.flatMap(address => [
      { others: { contains: [{ who: address }] } },
      { address: { equalTo: address } },
    ]);

    const exposures: EraExposureShares[] = [];
    let indexedTo = -1;
    let expectedCount: number | null = null;
    let paged = false;
    let offset = 0;

    for (let page = 0; page < MAX_PAGES; page++) {
      const response = await client.request(GET_ERA_EXPOSURES, {
        filters,
        eraFrom,
        eraTo,
        first: PAGE_SIZE,
        offset,
      });

      const parsed = responseSchema.safeParse(response);
      if (!parsed.success) {
        console.error('Staking: unexpected eraValidatorInfos shape from', url, parsed.error);

        return null;
      }

      const { nodes, totalCount } = parsed.data.eraValidatorInfos;

      // Coverage and size are fixed by the first page. A row indexed mid-scan
      // lands on a page already read and shifts the later ones, so a count that
      // moves means the pages no longer add up to one consistent set.
      if (expectedCount === null) {
        expectedCount = totalCount;
        indexedTo = parsed.data.indexedTo.nodes[0]?.era ?? -1;
      } else if (totalCount !== expectedCount) {
        break;
      }

      for (const node of nodes) {
        exposures.push({
          era: node.era,
          validator: toAccountId(node.address),
          total: node.total,
          own: node.own,
          shares: buildShares(node, byAddress),
        });
      }

      offset += nodes.length;
      if (offset >= expectedCount) {
        paged = true;
        break;
      }
      // Fewer rows than promised and no more coming: the set is not whole.
      if (nodes.length === 0) break;
    }

    return { exposures, paged, covers: indexedTo >= eraTo };
  } catch (error) {
    console.error('Staking: era exposure request failed for', url, error);

    return null;
  }
}

function isSameExposure(a: EraExposureShares, b: EraExposureShares): boolean {
  return a.total === b.total && a.own === b.own && isEqual(a.shares, b.shares);
}

/**
 * Every (era, validator) our stashes were exposed to, with each stash's own
 * slice picked out of the nominator list, and how far the answer can be
 * trusted.
 *
 * One request for the whole selection rather than one per stash: accounts of a
 * wallet usually back the same operators, so the union of (era, validator) rows
 * is far smaller than the sum of the per-stash lists — and it is the rows, not
 * the stashes, that cost.
 *
 * Each indexer is read on its own and only its whole answer is used — a source
 * that fails halfway contributes nothing. The answer is `complete` only when no
 * source failed or was cut short, no two sources disagree, and at least one of
 * them has indexed up to the end of the range. Sources that report different
 * figures for the same `(era, validator)` drop that row instead of one of them
 * silently winning. `unavailable` — no indexer answered: reporting that as "no
 * exposure" would hide real money.
 */
export async function fetchEraExposureShares({
  rewardSources,
  stashes,
  eraFrom,
  eraTo,
}: Params): Promise<IndexedExposureShares> {
  if (rewardSources.length === 0 || stashes.length === 0 || eraTo < eraFrom) {
    return { exposures: [], completeness: 'unavailable' };
  }

  const answers = await Promise.all(rewardSources.map(source => fetchSource(source, { stashes, eraFrom, eraTo })));
  const answered = answers.filter(nonNullable);

  if (answered.length === 0) return { exposures: [], completeness: 'unavailable' };

  const merged = new Map<string, EraExposureShares>();
  const conflicts = new Set<string>();

  for (const { exposures } of answered) {
    for (const exposure of exposures) {
      const key = exposureKey(exposure.era, exposure.validator);
      const known = merged.get(key);

      if (known && !isSameExposure(known, exposure)) {
        conflicts.add(key);
      }
      merged.set(key, exposure);
    }
  }

  for (const key of conflicts) {
    merged.delete(key);
  }

  const complete =
    answered.length === answers.length &&
    conflicts.size === 0 &&
    answered.every(answer => answer.paged) &&
    answered.some(answer => answer.covers);

  return { exposures: Array.from(merged.values()), completeness: complete ? 'complete' : 'partial' };
}
