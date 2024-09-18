import { type ApiPromise } from '@polkadot/api';

import { substrateRpcPool } from '@/shared/api/substrate-helpers';
import { type Address } from '@/shared/core';
import { pjsSchema } from '@/shared/polkadotjs-schemas';

import { ambassadorCoreMemberEvidence, ambassadorCoreMemberStatus, ambassadorCoreParams } from './schema';

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
  members(api: ApiPromise, addresses: Address[]) {
    const schema = pjsSchema.vec(
      pjsSchema.tuppleMap(['account', pjsSchema.accountId], ['status', ambassadorCoreMemberStatus]),
    );

    return substrateRpcPool.call(() => getQuery(api, 'member').entries(addresses)).then(schema.parse);
  },

  /**
   * Some evidence together with the desired outcome for which it was presented.
   */
  memberEvidences(api: ApiPromise, addresses: Address[]) {
    const schema = pjsSchema.vec(
      pjsSchema.tuppleMap(['account', pjsSchema.accountId], ['status', ambassadorCoreMemberEvidence]),
    );

    return substrateRpcPool.call(() => getQuery(api, 'member').entries(addresses)).then(schema.parse);
  },
};
