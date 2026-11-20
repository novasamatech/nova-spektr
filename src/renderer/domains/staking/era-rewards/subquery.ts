import { GraphQLClient } from 'graphql-request';
import { isEqual } from 'lodash';
import { z } from 'zod';

import { type EraIndex } from '@/shared/core';
import { toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { exposureKey } from '../exposure-key';
import {
  type EraSourceMeta,
  type SourceWalk,
  ERA_SOURCE_STATUS,
  emptyScan,
  eraSourceStatusSchema,
  mergeEraScans,
  toEraSourceMeta,
  walkSourcePages,
} from '../source-scan';
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

const GET_ERA_EXPOSURES = `
  query EraExposures($filters: [EraValidatorInfoFilter!]!, $eraFrom: Int!, $eraTo: Int!, $first: Int!, $offset: Int!) {
    ${ERA_SOURCE_STATUS}
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

const responseSchema = eraSourceStatusSchema.extend({
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

/** One indexer's own walk, kept apart from every other indexer's. */
async function walkSource(
  { url, addressPrefix }: RewardSource,
  { stashes, eraFrom, eraTo }: Omit<Params, 'rewardSources'>,
): Promise<SourceWalk<EraExposureShares, EraSourceMeta>> {
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

    return await walkSourcePages(url, MAX_PAGES, async offset => {
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

      return {
        rows: nodes.map(node => ({
          era: node.era,
          validator: toAccountId(node.address),
          total: node.total,
          own: node.own,
          shares: buildShares(node, byAddress),
        })),
        totalCount,
        meta: toEraSourceMeta(parsed.data),
      };
    });
  } catch (error) {
    console.error('Staking: era exposure request failed for', url, error);

    return { status: 'failed', meta: null };
  }
}

function isSameExposure(a: EraExposureShares, b: EraExposureShares): boolean {
  return a.total === b.total && a.own === b.own && isEqual(a.shares, b.shares);
}

/**
 * Every (era, validator) our stashes were exposed to, with each stash's own
 * slice picked out of the nominator list, how far the answer can be trusted,
 * and where it came from.
 *
 * One request for the whole selection rather than one per stash: accounts of a
 * wallet usually back the same operators, so the union of (era, validator) rows
 * is far smaller than the sum of the per-stash lists — and it is the rows, not
 * the stashes, that cost.
 *
 * Each indexer is walked on its own and its rows are used only when the walk
 * completed — one that fails on a page, runs into the page limit or changes
 * under the walk contributes nothing. Rows are merged by `(era, validator)`:
 * one two indexers hold with the same figures is kept once, one they hold with
 * different figures is a conflict and is dropped instead of either winning.
 *
 * The answer is `complete` only when every indexer was merged, none of them
 * disagree, and the eras they say they hold reach the whole range.
 * `unavailable` — no indexer was merged: reporting that as "no exposure" would
 * hide real money.
 */
export async function fetchEraExposureShares({
  rewardSources,
  stashes,
  eraFrom,
  eraTo,
}: Params): Promise<IndexedExposureShares> {
  if (stashes.length === 0 || eraTo < eraFrom) {
    return { exposures: [], completeness: 'unavailable', scan: emptyScan('era') };
  }

  const sources = await Promise.all(
    rewardSources.map(async source => ({
      url: source.url,
      walk: await walkSource(source, { stashes, eraFrom, eraTo }),
    })),
  );

  const { records, completeness, scan } = mergeEraScans({
    sources,
    requested: { from: eraFrom, to: eraTo },
    getKey: exposure => exposureKey(exposure.era, exposure.validator),
    isSame: isSameExposure,
  });

  // The order of the rows never depends on which indexer was listed first.
  const exposures = records.sort((a, b) => b.era - a.era || a.validator.localeCompare(b.validator));

  return { exposures, completeness, scan };
}
