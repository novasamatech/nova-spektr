import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';

import { type EraIndex } from '@/shared/core';
import { nonNullable, toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { exposureKey } from '../exposure-key';
import { type RewardSource } from '../types';

import { type DataCompleteness, type EraValidatorExposure } from './types';

/** Page size of a single indexer request. */
const PAGE_SIZE = 500;
/** Hard stop for pagination — `historyDepth * maxNominations` never exceeds it. */
const MAX_PAGES = 20;

/**
 * Validators the stash was exposed to in the given era range — either as a
 * nominator (member of `others`) or as the validator itself.
 *
 * `indexedTo` is the newest era the indexer holds at all: an indexer that
 * stopped short of the range answers "no rows" for it, and that answer must not
 * be read as "the stash was exposed nowhere".
 */
const GET_ERA_VALIDATORS = `
  query NominatorEraValidators($address: String!, $eraFrom: Int!, $eraTo: Int!, $first: Int!, $offset: Int!) {
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
};

/** What one indexer said, kept apart from every other indexer's answer. */
type SourceAnswer = {
  exposures: EraValidatorExposure[];
  /** Paging reached `totalCount` — nothing of the filtered set was left out. */
  paged: boolean;
  /** The indexer has reached the end of the range. */
  covers: boolean;
};

async function fetchSource(
  { url, addressPrefix }: RewardSource,
  { stash, eraFrom, eraTo }: Omit<FetchNominatorEraValidatorsParams, 'rewardSources'>,
): Promise<SourceAnswer | null> {
  try {
    const client = new GraphQLClient(url);
    const address = toAddress(stash, { prefix: addressPrefix });

    const exposures: EraValidatorExposure[] = [];
    let indexedTo = -1;
    let paged = false;
    let offset = 0;

    for (let page = 0; page < MAX_PAGES; page++) {
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
      indexedTo = Math.max(indexedTo, parsed.data.indexedTo.nodes[0]?.era ?? -1);

      for (const node of nodes) {
        exposures.push({ era: node.era, validator: toAccountId(node.address), total: node.total, own: node.own });
      }

      offset += nodes.length;
      if (offset >= totalCount) {
        paged = true;
        break;
      }
      // Fewer rows than promised and no more coming: the set is not whole.
      if (nodes.length === 0) break;
    }

    return { exposures, paged, covers: indexedTo >= eraTo };
  } catch (error) {
    console.error('Staking: era validators request failed for', url, error);

    return null;
  }
}

/**
 * Exposures of the stash over the era range, merged from every configured
 * indexer, and how far the merged answer can be trusted.
 *
 * Each indexer is read on its own and only its whole answer is used — a source
 * that fails halfway contributes nothing. The answer is `complete` only when no
 * source failed or was cut short, no two sources disagree, and at least one of
 * them has indexed up to the end of the range. Sources that report different
 * figures for the same `(era, validator)` drop that key instead of one of them
 * silently winning.
 */
export async function fetchNominatorEraValidators({
  rewardSources,
  stash,
  eraFrom,
  eraTo,
}: FetchNominatorEraValidatorsParams): Promise<IndexedExposures> {
  if (rewardSources.length === 0 || eraTo < eraFrom) return { exposures: [], completeness: 'unavailable' };

  const answers = await Promise.all(rewardSources.map(source => fetchSource(source, { stash, eraFrom, eraTo })));
  const answered = answers.filter(nonNullable);

  if (answered.length === 0) return { exposures: [], completeness: 'unavailable' };

  const merged = new Map<string, EraValidatorExposure>();
  const conflicts = new Set<string>();

  for (const { exposures } of answered) {
    for (const exposure of exposures) {
      const key = exposureKey(exposure.era, exposure.validator);
      const known = merged.get(key);

      if (known && (known.total !== exposure.total || known.own !== exposure.own)) {
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
