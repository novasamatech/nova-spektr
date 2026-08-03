import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';

import { type EraIndex } from '@/shared/core';
import { toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { exposureKey } from '../exposure-key';
import { type RewardSource } from '../types';

import { type EraExposureShares } from './types';

/**
 * Page size of a single indexer request.
 *
 * Smaller than the payout scan's, on purpose: these rows carry the validator's
 * whole nominator list (~10 KB each, far more for a full page), and the only
 * part of it we keep is our own line.
 */
const PAGE_SIZE = 100;
const MAX_PAGES = 60;

const GET_ERA_EXPOSURES = `
  query EraExposures($filters: [EraValidatorInfoFilter!]!, $eraFrom: Int!, $eraTo: Int!, $first: Int!, $offset: Int!) {
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
 * Every (era, validator) our stashes were exposed to, with each stash's own
 * slice picked out of the nominator list.
 *
 * One request for the whole selection rather than one per stash: accounts of a
 * wallet usually back the same operators, so the union of (era, validator) rows
 * is far smaller than the sum of the per-stash lists — and it is the rows, not
 * the stashes, that cost.
 *
 * `null` when no configured indexer answered. An empty array means the indexer
 * answered and nothing was exposed; reporting a failed request as "no rewards"
 * hides real money.
 */
export async function fetchEraExposureShares({
  rewardSources,
  stashes,
  eraFrom,
  eraTo,
}: Params): Promise<EraExposureShares[] | null> {
  if (rewardSources.length === 0 || stashes.length === 0 || eraTo < eraFrom) return null;

  const collected = new Map<string, EraExposureShares>();
  let answered = false;

  await Promise.allSettled(
    rewardSources.map(async ({ url, addressPrefix }) => {
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

            return;
          }

          const { nodes, totalCount } = parsed.data.eraValidatorInfos;

          for (const node of nodes) {
            const validator = toAccountId(node.address);
            const shares: Record<AccountId, string> = {};

            for (const other of node.others ?? []) {
              const stash = byAddress.get(other.who);
              if (stash) {
                shares[stash] = other.value;
              }
            }

            const entry = collected.get(exposureKey(node.era, validator));
            if (entry) {
              Object.assign(entry.shares, shares);
            } else {
              collected.set(exposureKey(node.era, validator), {
                era: node.era,
                validator,
                total: node.total,
                own: node.own,
                shares,
              });
            }
          }

          offset += nodes.length;
          if (nodes.length === 0 || offset >= totalCount) break;
        }

        answered = true;
      } catch (error) {
        console.error('Staking: era exposure request failed for', url, error);
      }
    }),
  );

  return answered ? [...collected.values()] : null;
}
