import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';

import { type EraIndex } from '@/shared/core';
import { toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type DataCompleteness, type ScanReport } from '../completeness';
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

import { type EraValidatorExposure } from './types';

/** Page size of a single indexer request. */
const PAGE_SIZE = 500;
/** Hard stop for pagination — `historyDepth * maxNominations` never exceeds it. */
const MAX_PAGES = 20;

/**
 * Validators the stash was exposed to in the given era range — either as a
 * nominator (member of `others`) or as the validator itself.
 */
const GET_ERA_VALIDATORS = `
  query NominatorEraValidators($address: String!, $eraFrom: Int!, $eraTo: Int!, $first: Int!, $offset: Int!) {
    ${ERA_SOURCE_STATUS}
    eraValidatorInfos(
      first: $first
      offset: $offset
      orderBy: ERA_DESC
      filter: {
        era: { greaterThanOrEqualTo: $eraFrom, lessThanOrEqualTo: $eraTo }
        or: [{ others: { contains: [{ who: $address }] } }, { address: { equalTo: $address } }]
      }
    ) {
      totalCount
      nodes {
        era
        address
        own
        total
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
      }),
    ),
  }),
});

type FetchNominatorEraValidatorsParams = {
  rewardSources: RewardSource[];
  stash: AccountId;
  eraFrom: EraIndex;
  eraTo: EraIndex;
};

export type IndexedExposures = {
  exposures: EraValidatorExposure[];
  completeness: DataCompleteness;
  /** Which indexer stands for which eras, and what the answer is missing. */
  scan: ScanReport;
};

/** One indexer's own walk, kept apart from every other indexer's. */
async function walkSource(
  { url, addressPrefix }: RewardSource,
  { stash, eraFrom, eraTo }: Omit<FetchNominatorEraValidatorsParams, 'rewardSources'>,
): Promise<SourceWalk<EraValidatorExposure, EraSourceMeta>> {
  try {
    const client = new GraphQLClient(url);
    const address = toAddress(stash, { prefix: addressPrefix });

    return await walkSourcePages(url, MAX_PAGES, async offset => {
      const response = await client.request(GET_ERA_VALIDATORS, {
        address,
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
        })),
        totalCount,
        meta: toEraSourceMeta(parsed.data),
      };
    });
  } catch (error) {
    console.error('Staking: era validators request failed for', url, error);

    return { status: 'failed', meta: null };
  }
}

function isSameExposure(a: EraValidatorExposure, b: EraValidatorExposure): boolean {
  return a.total === b.total && a.own === b.own;
}

/**
 * Exposures of the stash over the era range, merged from every configured
 * indexer, how far the merged answer can be trusted, and where it came from.
 *
 * Each indexer is walked on its own and its rows are used only when the walk
 * completed — one that fails on a page, runs into the page limit or changes
 * under the walk contributes nothing. Rows are merged by `(era, validator)`:
 * one two indexers hold with the same figures is kept once, one they hold with
 * different figures is a conflict and is dropped instead of either winning.
 *
 * The answer is `complete` only when every indexer was merged, none of them
 * disagree, and the eras they say they hold reach the whole range.
 */
export async function fetchNominatorEraValidators({
  rewardSources,
  stash,
  eraFrom,
  eraTo,
}: FetchNominatorEraValidatorsParams): Promise<IndexedExposures> {
  if (eraTo < eraFrom) return { exposures: [], completeness: 'unavailable', scan: emptyScan('era') };

  const sources = await Promise.all(
    rewardSources.map(async source => ({ url: source.url, walk: await walkSource(source, { stash, eraFrom, eraTo }) })),
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
