import { type ApiPromise } from '@polkadot/api';

import { type AccountId } from '@/shared/core';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { pjsSchema } from '@/shared/polkadotjsSchemas';
import { referendumId } from '../referenda/schema';

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
      pjsSchema.tuppleMap(
        ['key', pjsSchema.storageKey(pjsSchema.u16, pjsSchema.accountId)],
        ['index', pjsSchema.optional(pjsSchema.u32)],
      ),
    );

    return getQuery(type, api, 'idToIndex').entries().then(schema.parse);
  },

  /**
   * The members in the collective by index. All indices in the range
   * `0..MemberCount` will return `Some`, however a member's index is not
   * guaranteed to remain unchanged over time.
   */
  indexToId(type: PalletType, api: ApiPromise) {
    const schema = pjsSchema.vec(
      pjsSchema.tuppleMap(
        ['key', pjsSchema.storageKey(collectiveRank, pjsSchema.u32)],
        ['index', pjsSchema.optional(pjsSchema.accountId)],
      ),
    );

    return getQuery(type, api, 'indexToId').entries().then(schema.parse);
  },

  /**
   * The number of members in the collective who have at least the rank
   * according to the index of the vec.
   */
  memberCount(type: PalletType, api: ApiPromise, ranks: CollectiveRank[]) {
    const schema = pjsSchema.vec(
      pjsSchema.tuppleMap(
        ['rank', pjsSchema.storageKey(collectiveRank).transform(x => x[0])],
        ['count', pjsSchema.u32],
      ),
    );

    return getQuery(type, api, 'memberCount').entries(ranks).then(schema.parse);
  },

  /**
   * The current members of the collective.
   */
  members(type: PalletType, api: ApiPromise) {
    const schema = pjsSchema.vec(
      pjsSchema.tuppleMap(
        ['account', pjsSchema.storageKey(pjsSchema.accountId).transform(x => x[0])],
        ['member', pjsSchema.optional(collectiveMemberRecord)],
      ),
    );

    return getQuery(type, api, 'members').entries().then(schema.parse);
  },

  /**
   * Votes on a given proposal, if it is ongoing.
   */
  voting(type: PalletType, api: ApiPromise, keys: [referendum: ReferendumId, account: AccountId][]) {
    const keySchema = pjsSchema.storageKey(referendumId, pjsSchema.accountId).transform(([referendum, account]) => ({
      referendum,
      account,
    }));
    const schema = pjsSchema.vec(
      pjsSchema.tuppleMap(['key', keySchema], ['vote', pjsSchema.optional(collectiveVoteRecord)]),
    );

    return getQuery(type, api, 'voting').multi(keys).then(schema.parse);
  },
};
