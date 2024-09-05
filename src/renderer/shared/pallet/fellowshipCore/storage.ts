import { type ApiPromise } from '@polkadot/api';

import { substrateRpcPool } from '@/shared/api/substrate-helpers';
import { type Address } from '@/shared/core';
import { pjsSchema } from '@/shared/polkadotjs-schemas';

import { coreFellowshipMemberEvidence, coreFellowshipMemberStatus, coreFellowshipParams } from './schema';

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
    return substrateRpcPool.call(() => getQuery(api, 'params').entries()).then(coreFellowshipParams.parse);
  },

  /**
   * The status of a claimant.
   */
  members(api: ApiPromise, addresses: Address[]) {
    const schema = pjsSchema.vec(
      pjsSchema.tuppleMap(['account', pjsSchema.accountId], ['status', coreFellowshipMemberStatus]),
    );

    return substrateRpcPool.call(() => getQuery(api, 'member').entries(addresses)).then(schema.parse);
  },

  /**
   * Some evidence together with the desired outcome for which it was presented.
   */
  memberEvidences(api: ApiPromise, addresses: Address[]) {
    const schema = pjsSchema.vec(
      pjsSchema.tuppleMap(['account', pjsSchema.accountId], ['status', coreFellowshipMemberEvidence]),
    );

    return substrateRpcPool.call(() => getQuery(api, 'member').entries(addresses)).then(schema.parse);
  },
};
