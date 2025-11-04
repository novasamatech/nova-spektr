import { type ApiPromise } from '@polkadot/api';
import { zipWith } from 'lodash';

import { substrateRpcPool } from '@/shared/api/substrate-helpers';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';

import { getPalletName } from './helpers';
import {
  type CollectiveCoreMemberEvidence,
  collectiveCoreMemberEvidence,
  collectiveCoreMemberStatus,
  collectiveCoreParams,
} from './schema';
import { type PalletType } from './types';

type Callback<T> = (value: T) => unknown;

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
    return substrateRpcPool.call(() => getQuery(type, api, 'params')()).then(collectiveCoreParams.parse);
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
  memberEvidence(type: PalletType, api: ApiPromise, accounts: AccountId[]) {
    const schema = pjsSchema.vec(pjsSchema.optional(collectiveCoreMemberEvidence));

    return substrateRpcPool
      .call(() => getQuery(type, api, 'memberEvidence').multi(accounts))
      .then(schema.parse)
      .then(evidences => zipWith(accounts, evidences, (account, evidence) => ({ account, evidence })));
  },

  /**
   * Some evidence together with the desired outcome for which it was presented.
   */
  memberEvidenceWatch(
    type: PalletType,
    api: ApiPromise,
    accounts: AccountId[],
    callback: Callback<{ account: AccountId; evidence: CollectiveCoreMemberEvidence | null }[]>,
  ) {
    const schema = pjsSchema.vec(pjsSchema.optional(collectiveCoreMemberEvidence));

    const query = getQuery(type, api, 'memberEvidence');

    return query.multi(accounts, data => {
      const evidences = schema.parse(data);
      const result = zipWith(accounts, evidences, (account, evidence) => ({ account, evidence }));

      callback(result);
    });
  },
};
