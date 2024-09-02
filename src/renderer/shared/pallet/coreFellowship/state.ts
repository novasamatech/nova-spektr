import { type ApiPromise } from '@polkadot/api';

import { type Address } from '@/shared/core';
import { pjsSchema } from '@/shared/polkadotjsSchemas';

import { coreFellowshipMemberEvidence, coreFellowshipMemberStatus, coreFellowshipParams } from './schema';

const getQuery = (api: ApiPromise, name: string) => {
  const coreFellowship = api.query['coreFellowship'];
  if (!coreFellowship) {
    throw new TypeError(`coreFellowship pallet not found in ${api.runtimeChain.toString()} chain`);
  }

  const query = coreFellowship[name];

  if (!query) {
    throw new TypeError(`${name} query not found`);
  }

  return query;
};

export const state = {
  /**
   * The overall status of the system.
   */
  params(api: ApiPromise) {
    return getQuery(api, 'params').entries().then(coreFellowshipParams.parse);
  },

  /**
   * The status of a claimant.
   */
  members(api: ApiPromise, addresses: Address[]) {
    const schema = pjsSchema.vec(
      pjsSchema.tuppleMap(['account', pjsSchema.accountId], ['status', coreFellowshipMemberStatus]),
    );

    return getQuery(api, 'member').entries(addresses).then(schema.parse);
  },

  /**
   * Some evidence together with the desired outcome for which it was presented.
   */
  memberEvidences(api: ApiPromise, addresses: Address[]) {
    const schema = pjsSchema.vec(
      pjsSchema.tuppleMap(['account', pjsSchema.accountId], ['status', coreFellowshipMemberEvidence]),
    );

    return getQuery(api, 'member').entries(addresses).then(schema.parse);
  },
};
