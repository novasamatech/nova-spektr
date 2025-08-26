import { zipWith } from 'lodash';
import { type SS58String } from 'polkadot-api';
import { z } from 'zod';

import { substrateRpcPool } from '@/shared/api/substrate-helpers';
import { toAccountId, toAddress } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { papiHelpers } from '@/shared/papi-helpers';
import { type AccountId } from '@/shared/papi-schemas';
import { type PolkadotApi } from '@/domains/network';

import { getPalletName } from './helpers';
import { collectiveVoteRecord } from './schemas';
import { type PalletType } from './types';
import { pjsSchema } from '@/shared/polkadotjs-schemas';

const getQuery = (type: PalletType, papi: PolkadotApi) => {
  return papiHelpers.getTypedApis(papi, ['dot_col'], ({ api }) => {
    return api.query[getPalletName(type)];
  });
};

export const storage = {
  /**
   * The index of each rank's member into the group of members who have at least
   * that rank.
   */
  idToIndex(type: PalletType, papi: PolkadotApi) {
    const schema = z.array(
      z
        .object({
          keyArgs: z.tuple([z.number(), z.string()]).transform(v => [v[0], toAccountId(v[1])]),
          value: z.number(),
        })
        .transform(({ keyArgs, value }) => ({ key: [keyArgs[0], keyArgs[1]], index: value })),
    );

    return substrateRpcPool.call(() => getQuery(type, papi).IdToIndex.getEntries()).then(schema.parse);
  },

  /**
   * The members in the collective by index. All indices in the range
   * `0..MemberCount` will return `Some`, however a member's index is not
   * guaranteed to remain unchanged over time.
   */
  indexToId(type: PalletType, papi: PolkadotApi) {
    const schema = z.array(
      z
        .object({
          keyArgs: z.tuple([z.number(), z.number()]),
          value: z.string().transform(toAccountId),
        })
        .transform(({ keyArgs, value }) => ({ key: keyArgs, index: value })),
    );

    return substrateRpcPool.call(() => getQuery(type, papi).IndexToId.getEntries()).then(schema.parse);
  },

  /**
   * The number of members in the collective who have at least the rank
   * according to the index of the vec.
   */
  memberCount(type: PalletType, papi: PolkadotApi, ranks: number[]) {
    const schema = z.array(
      z.object({
        rank: z.number(),
        count: z.number(),
      }),
    );

    const ranksTuples = ranks.map(r => [r] satisfies [Key: number]);

    return substrateRpcPool.call(() => getQuery(type, papi).MemberCount.getValues(ranksTuples)).then(schema.parse);
  },

  /**
   * The current members of the collective.
   */
  members(type: PalletType, papi: PolkadotApi) {
    const schema = z.array(
      z
        .object({
          keyArgs: z.tuple([z.string()]).transform(a => toAccountId(a[0])),
          value: z.number().transform(rank => ({ rank })),
        })
        .transform(({ keyArgs, value }) => ({ account: keyArgs, member: value })),
    );

    return substrateRpcPool.call(() => getQuery(type, papi).Members.getEntries()).then(x => schema.parse(x));
  },

  // TODO: resolve later
  /**
   * The current members of the collective.
   */
  // async *membersPaged(type: PalletType, papi: PolkadotApi, pageSize: number) {
  //   const schema = z.array(
  //     z.object({
  //       accountId: papiSchema.accountId,
  //       member: z.number(),
  //     }),
  //   );
  //
  //   for await (const result of polkadotjsHelpers.createPagedRequest({
  //     query: getQuery(type, papi).Members,
  //     pageSize,
  //   })) {
  //     yield schema.parse(result);
  //   }
  // },

  /**
   * Votes on a given proposal, if it is ongoing.
   */
  voting(type: PalletType, papi: PolkadotApi, keys: [ReferendumId, AccountId][]) {
    const votingResponseSchema = z.array(z.optional(collectiveVoteRecord));

    const typedKeys = keys.map(
      ([referendumId, accountId]) => [referendumId, toAddress(accountId)],
    );

    return substrateRpcPool
      .call(() => getQuery(type, papi).Voting.getValues(typedKeys))
      .then(votingResponseSchema.parse)
      .then(votes =>
        zipWith(votes, keys, (vote, key) => ({
          key: { referendumId: key[0], accountId: key[1] },
          vote,
        })),
      );
  },
};
