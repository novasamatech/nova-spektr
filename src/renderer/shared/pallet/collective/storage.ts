import { type ApiPromise } from '@polkadot/api';
import { zipWith } from 'lodash';

import { substrateRpcPool } from '@/shared/api/substrate-helpers';
import { type ReferendumId, referendaPallet } from '@/shared/pallet/referenda';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';

import { getPalletName } from './helpers';
import { type CollectiveRank, collectiveMemberRecord, collectiveRank, collectiveVoteRecord } from './schemas';
import { type PalletType } from './types';

const getQuery = (type: PalletType, api: ApiPromise, name: string) => {
  const palletName = getPalletName(type);
  const pallet = api.query[palletName];
  if (!pallet) {
    throw new TypeError(`${palletName} pallet not found in ${api.runtimeChain.toString()} chain`);
  }

  const query = pallet[name];
  if (!query) {
    throw new TypeError(`${name} query not found`);
  }

  return query;
};

export const storage = {
  /**
   * The index of each ranks's member into the group of members who have at
   * least that rank.
   */
  idToIndex(type: PalletType, api: ApiPromise) {
    const schema = pjsSchema.vec(
      pjsSchema.tupleMap(
        ['key', pjsSchema.storageKey(pjsSchema.u16, pjsSchema.accountId)],
        ['index', pjsSchema.optional(pjsSchema.u32)],
      ),
    );

    return substrateRpcPool.call(() => getQuery(type, api, 'idToIndex').entries()).then(schema.parse);
  },

  /**
   * The members in the collective by index. All indices in the range
   * `0..MemberCount` will return `Some`, however a member's index is not
   * guaranteed to remain unchanged over time.
   */
  indexToId(type: PalletType, api: ApiPromise) {
    const schema = pjsSchema.vec(
      pjsSchema.tupleMap(
        ['key', pjsSchema.storageKey(collectiveRank, pjsSchema.u32)],
        ['index', pjsSchema.optional(pjsSchema.accountId)],
      ),
    );

    return substrateRpcPool.call(() => getQuery(type, api, 'indexToId').entries()).then(schema.parse);
  },

  /**
   * The number of members in the collective who have at least the rank
   * according to the index of the vec.
   */
  memberCount(type: PalletType, api: ApiPromise, ranks: CollectiveRank[]) {
    const schema = pjsSchema.vec(
      pjsSchema.tupleMap(['rank', pjsSchema.storageKey(collectiveRank).transform(x => x[0])], ['count', pjsSchema.u32]),
    );

    return substrateRpcPool.call(() => getQuery(type, api, 'memberCount').entries(ranks)).then(schema.parse);
  },

  /**
   * The current members of the collective.
   */
  members(type: PalletType, api: ApiPromise) {
    const schema = pjsSchema.vec(
      pjsSchema.tupleMap(
        ['account', pjsSchema.storageKey(pjsSchema.accountId).transform(x => x[0])],
        ['member', pjsSchema.optional(collectiveMemberRecord)],
      ),
    );

    return substrateRpcPool.call(() => getQuery(type, api, 'members').entries()).then(schema.parse);
  },

  /**
   * The current members of the collective.
   */
  async *membersPaged(type: PalletType, api: ApiPromise, pageSize: number) {
    const schema = pjsSchema.vec(
      pjsSchema.tupleMap(
        ['accountId', pjsSchema.storageKey(pjsSchema.accountId).transform(x => x[0])],
        ['member', pjsSchema.optional(collectiveMemberRecord)],
      ),
    );

    for await (const result of polkadotjsHelpers.createPagedRequest({
      query: getQuery(type, api, 'members'),
      pageSize,
    })) {
      yield schema.parse(result);
    }
  },

  /**
   * Votes on a given proposal, if it is ongoing.
   */
  voting(
    type: PalletType,
    api: ApiPromise,
    keys?: (readonly [referendum: ReferendumId, account: AccountId])[] | ReferendumId,
  ) {
    const votingResponseSchema = pjsSchema.vec(pjsSchema.optional(collectiveVoteRecord));

    if (!Array.isArray(keys)) {
      const votingWithKeyResponseSchema = pjsSchema.vec(
        pjsSchema.tupleMap(
          [
            'key',
            pjsSchema
              .storageKey(referendaPallet.schema.referendumId, pjsSchema.accountId)
              .transform(([referendumId, accountId]) => ({ referendumId, accountId })),
          ],
          ['vote', pjsSchema.optional(collectiveVoteRecord)],
        ),
      );

      return substrateRpcPool
        .call(() => {
          const query = getQuery(type, api, 'voting');
          return keys ? query.entries(keys) : query.entries();
        })
        .then(votingWithKeyResponseSchema.parse);
    }

    return substrateRpcPool
      .call(() => getQuery(type, api, 'voting').multi(keys))
      .then(votingResponseSchema.parse)
      .then(votes =>
        zipWith(votes, keys, (vote, key) => ({
          key: { referendumId: key[0], accountId: key[1]! },
          vote,
        })),
      );
  },
};
