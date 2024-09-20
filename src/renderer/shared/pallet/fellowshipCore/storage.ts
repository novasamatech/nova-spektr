import { type ApiPromise } from '@polkadot/api';

import { substrateRpcPool } from '@/shared/api/substrate-helpers';
import { type Address } from '@/shared/core';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { ambassadorCoreMemberStatus } from '../ambassadorCore/schema';

import { fellowshipCoreMemberEvidence, fellowshipCoreParams } from './schema';

const getQuery = (api: ApiPromise, name: string) => {
  const fellowshipCore = api.query['fellowshipCore'];
  if (!fellowshipCore) {
    throw new TypeError(`fellowshipCore pallet not found in ${api.runtimeChain.toString()} chain`);
  }

  const query = fellowshipCore[name];

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
    return substrateRpcPool.call(() => getQuery(api, 'params').entries()).then(fellowshipCoreParams.parse);
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
