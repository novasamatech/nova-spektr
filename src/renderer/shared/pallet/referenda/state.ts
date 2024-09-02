import { type ApiPromise } from '@polkadot/api';
import { z } from 'zod';

import { type ReferendumId } from '@/shared/core';
import { pjsSchema } from '@/shared/polkadotjsSchemas';

import { referendaReferendumInfoConvictionVotingTally, referendumId, trackId } from './schema';

const getQuery = (api: ApiPromise, name: string) => {
  const referenda = api.query['referenda'];
  if (!referenda) {
    throw new TypeError(`referenda pallet not found in ${api.runtimeChain.toString()} chain`);
  }

  const query = referenda[name];

  if (!query) {
    throw new TypeError(`${name} query not found`);
  }

  return query;
};

export const state = {
  /**
   * The number of referenda being decided currently.
   */
  decidingCount(api: ApiPromise) {
    const schema = z.tuple([trackId, pjsSchema.u32]);

    return getQuery(api, 'decidingCount').entries().then(schema.parse);
  },

  /**
   * Information concerning any given referendum.
   */
  referendumInfoFor(api: ApiPromise, ids?: ReferendumId[]) {
    const schema = z.tuple([referendumId, pjsSchema.optional(referendaReferendumInfoConvictionVotingTally)]);

    return getQuery(api, 'referendumInfoFor').entries(ids).then(schema.parse);
  },
};
