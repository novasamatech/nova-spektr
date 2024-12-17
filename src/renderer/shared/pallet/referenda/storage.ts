import { type ApiPromise } from '@polkadot/api';
import { zipWith } from 'lodash';

import { substrateRpcPool } from '@/shared/api/substrate-helpers';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { pjsSchema } from '@/shared/polkadotjs-schemas';

import { getPalletName } from './helpers';
import {
  type ReferendumId,
  type TrackId,
  referendaReferendumInfoConvictionVotingTally,
  referendumId,
  trackId,
} from './schema';
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
   * The number of referenda being decided currently.
   */
  decidingCount(type: PalletType, api: ApiPromise) {
    const schema = pjsSchema.vec(pjsSchema.tupleMap(['track', trackId], ['decidingCount', pjsSchema.u32]));

    return substrateRpcPool.call(() => getQuery(type, api, 'decidingCount').entries()).then(schema.parse);
  },

  /**
   * Information concerning any given referendum.
   */
  async referendumInfoFor(type: PalletType, api: ApiPromise, ids?: ReferendumId[]) {
    if (ids) {
      const schemaWithIds = pjsSchema
        .vec(pjsSchema.optional(referendaReferendumInfoConvictionVotingTally))
        .transform(items => zipWith(ids, items, (id, info) => ({ id, info })));

      return substrateRpcPool.call(() => getQuery(type, api, 'referendumInfoFor').multi(ids)).then(schemaWithIds.parse);
    } else {
      const schema = pjsSchema.vec(
        pjsSchema.tupleMap(
          ['id', pjsSchema.storageKey(referendumId).transform(keys => keys[0])],
          ['info', pjsSchema.optional(referendaReferendumInfoConvictionVotingTally)],
        ),
      );

      return substrateRpcPool.call(() => getQuery(type, api, 'referendumInfoFor').entries()).then(schema.parse);
    }
  },

  /**
   * Information concerning any given referendum.
   */
  async *referendumInfoForPaged(type: PalletType, api: ApiPromise, pageSize: number) {
    const schema = pjsSchema.vec(
      pjsSchema.tupleMap(
        ['id', pjsSchema.storageKey(referendumId).transform(keys => keys[0])],
        ['info', pjsSchema.optional(referendaReferendumInfoConvictionVotingTally)],
      ),
    );

    for await (const result of polkadotjsHelpers.createPagedRequest({
      query: getQuery(type, api, 'referendumInfoFor'),
      pageSize,
    })) {
      yield schema.parse(result);
    }
  },

  /**
   * The next free referendum index, aka the number of referenda started so far.
   */
  referendumCount(type: PalletType, api: ApiPromise) {
    return substrateRpcPool.call(() => getQuery(type, api, 'referendumCount')()).then(pjsSchema.u32.parse);
  },

  /**
   * The sorted list of referenda ready to be decided but not yet being decided,
   * ordered by conviction-weighted approvals.
   *
   * This should be empty if `DecidingCount` is less than
   * `TrackInfo::max_deciding`.
   */
  trackQueue(type: PalletType, api: ApiPromise, track: TrackId) {
    const schema = pjsSchema.vec(pjsSchema.tupleMap(['approval', pjsSchema.blockHeight], ['referendum', referendumId]));

    return substrateRpcPool.call(() => getQuery(type, api, 'trackQueue')(track)).then(schema.parse);
  },
};
