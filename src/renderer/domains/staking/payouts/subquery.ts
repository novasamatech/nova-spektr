import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';

import { type EraIndex } from '@/shared/core';
import { toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
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

function exposureKey(era: EraIndex, validator: AccountId): string {
  return `${era}-${validator}`;
}

/**
 * `null` when no configured indexer produced a usable answer — an empty array
 * means the indexers answered and the stash was exposed nowhere. The caller has
 * to tell those apart: reporting a failed request as "no unclaimed rewards"
 * hides real money.
 */
export async function fetchNominatorEraValidators({
  rewardSources,
  stash,
  eraFrom,
  eraTo,
}: FetchNominatorEraValidatorsParams): Promise<EraValidatorExposure[] | null> {
  if (rewardSources.length === 0 || eraTo < eraFrom) return null;

  const collected = new Map<string, EraValidatorExposure>();
  let answered = false;

  await Promise.allSettled(
    rewardSources.map(async ({ url, addressPrefix }) => {
      try {
        const client = new GraphQLClient(url);
        const address = toAddress(stash, { prefix: addressPrefix });

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

            return;
          }

          const { nodes, totalCount } = parsed.data.eraValidatorInfos;

          for (const node of nodes) {
            const validator = toAccountId(node.address);

            collected.set(exposureKey(node.era, validator), {
              era: node.era,
              validator,
              total: node.total,
              own: node.own,
            });
          }

          offset += nodes.length;
          if (nodes.length === 0 || offset >= totalCount) break;
        }

        answered = true;
      } catch (error) {
        console.error('Staking: era validators request failed for', url, error);
      }
    }),
  );

  return answered ? Array.from(collected.values()) : null;
}
