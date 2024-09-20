import { type ApiPromise } from '@polkadot/api';

import { substrateRpcPool } from '@/shared/api/substrate-helpers';
import { type Address } from '@/shared/core';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { fellowshipCoreMemberEvidence } from '../fellowshipCore/schema';

import { ambassadorCoreMemberStatus, ambassadorCoreParams } from './schema';

const getQuery = (api: ApiPromise, name: string) => {
  const ambassadorCore = api.query['ambassadorCore'];
  if (!ambassadorCore) {
    throw new TypeError(`ambassadorCore pallet not found in ${api.runtimeChain.toString()} chain`);
  }

  const query = ambassadorCore[name];

  if (!query) {
    throw new TypeError(`${name} query not found`);
  }

  return query;
};

export const storage = {
  /**
   * The overall status of the system.
   */
  params(api: ApiPromise) {
    return substrateRpcPool.call(() => getQuery(api, 'params').entries()).then(ambassadorCoreParams.parse);
  },

  /**
   * The status of a claimant.
   */
  member(api: ApiPromise) {
    const schema = pjsSchema.vec(
      pjsSchema.tupleMap(
        ['account', pjsSchema.storageKey(pjsSchema.accountId).transform(x => x[0])],
        ['status', pjsSchema.optional(ambassadorCoreMemberStatus)],
      ),
    );

    return substrateRpcPool.call(() => getQuery(api, 'member').entries()).then(schema.parse);
  },

  /**
   * Some evidence together with the desired outcome for which it was presented.
   */
  memberEvidences(api: ApiPromise, addresses: Address[]) {
    const schema = pjsSchema.vec(
      pjsSchema.tupleMap(
        ['account', pjsSchema.storageKey(pjsSchema.accountId).transform(x => x[0])],
        ['status', pjsSchema.optional(fellowshipCoreMemberEvidence)],
      ),
    );

    return substrateRpcPool.call(() => getQuery(api, 'memberEvidences').entries(addresses)).then(schema.parse);
  },
};
