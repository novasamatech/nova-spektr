import { zipWith } from 'lodash';
import { type SS58String } from 'polkadot-api';
import { z } from 'zod';

import { substrateRpcPool } from '@/shared/api/substrate-helpers';
import { type ReferendumId, referendaPallet } from '@/shared/pallet/referenda';
import { papiHelpers } from '@/shared/papi-helpers';
import { type AccountId, papiSchema } from '@/shared/papi-schemas';
import { type PolkadotApi } from '@/domains/network';

import { getPalletName } from './helpers';
import { collectiveMemberRecord, collectiveVoteRecord } from './schemas';
import { type PalletType } from './types';

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
      z.object({
        key: z.tuple([z.number(), papiSchema.accountId]),
        index: z.number(),
      }),
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
      z.object({
        key: z.tuple([z.number(), z.number()]),
        index: papiSchema.accountId,
      }),
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
      z.object({
        account: papiSchema.accountId,
        member: collectiveMemberRecord,
      }),
    );

    return substrateRpcPool.call(() => getQuery(type, papi).Members.getEntries()).then(schema.parse);
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
  voting(type: PalletType, papi: PolkadotApi, keys: (readonly [ReferendumId, AccountId])[] | ReferendumId) {
    const votingResponseSchema = z.array(z.optional(collectiveVoteRecord));

    if (Array.isArray(keys)) {
      const typedKeys = keys.map(
        ([referendumId, accountId]) => [Number(referendumId), accountId] as [number, SS58String],
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
    }

    const votingWithKeyResponseSchema = z.array(
      z.object({
        key: z
          .tuple([referendaPallet.schema.referendumId, papiSchema.accountId])
          .transform(([referendumId, accountId]) => ({ referendumId, accountId })),
        vote: z.optional(collectiveVoteRecord),
      }),
    );

    return substrateRpcPool
      .call(() => getQuery(type, papi).Voting.getEntries(Number(keys)))
      .then(votingWithKeyResponseSchema.parse);
  },
};
