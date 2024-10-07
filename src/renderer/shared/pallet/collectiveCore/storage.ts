import { type ApiPromise } from '@polkadot/api';

import { substrateRpcPool } from '@/shared/api/substrate-helpers';
import { type Address } from '@/shared/core';
import { pjsSchema } from '@/shared/polkadotjs-schemas';

import { getPalletName } from './helpers';
import { collectiveCoreMemberEvidence, collectiveCoreMemberStatus, collectiveCoreParams } from './schema';
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
   * The overall status of the system.
   */
  params(type: PalletType, api: ApiPromise) {
    return substrateRpcPool.call(() => getQuery(type, api, 'params').entries()).then(collectiveCoreParams.parse);
  },

  /**
   * The status of a claimant.
   */
  member(type: PalletType, api: ApiPromise) {
    const schema = pjsSchema.vec(
      pjsSchema.tupleMap(
        ['account', pjsSchema.storageKey(pjsSchema.accountId).transform(x => x[0])],
        ['status', pjsSchema.optional(collectiveCoreMemberStatus)],
      ),
    );

    return substrateRpcPool.call(() => getQuery(type, api, 'member').entries()).then(schema.parse);
  },

  /**
   * Some evidence together with the desired outcome for which it was presented.
   */
  memberEvidences(type: PalletType, api: ApiPromise, addresses: Address[]) {
    const schema = pjsSchema.vec(
      pjsSchema.tupleMap(
        ['account', pjsSchema.storageKey(pjsSchema.accountId).transform(x => x[0])],
        ['status', pjsSchema.optional(collectiveCoreMemberEvidence)],
      ),
    );

    return substrateRpcPool.call(() => getQuery(type, api, 'memberEvidences').entries(addresses)).then(schema.parse);
  },
};
