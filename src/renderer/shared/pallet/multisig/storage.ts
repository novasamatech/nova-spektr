import { type ApiPromise } from '@polkadot/api';

import { substrateRpcPool } from '@/shared/api/substrate-helpers';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';

import { multisig } from './schema';

const getQuery = (api: ApiPromise, name: string) => {
  const pallet = api.query['multisig'];
  if (!pallet) {
    throw new TypeError(`multisig pallet not found in ${api.runtimeChain.toString()} chain`);
  }

  const query = pallet[name];

  if (!query) {
    throw new TypeError(`${name} query not found`);
  }

  return query;
};

export const storage = {
  /**
   * Get list of all multisig operations for given account
   */
  multisigs(api: ApiPromise, accountId: AccountId) {
    const schema = pjsSchema.vec(
      pjsSchema.tupleMap(
        [
          'key',
          pjsSchema
            .storageKey(pjsSchema.accountId, pjsSchema.u8Array)
            .transform(([accountId, callHash]) => ({ accountId, callHash })),
        ],
        ['multisig', pjsSchema.optional(multisig)],
      ),
    );

    return substrateRpcPool.call(() => getQuery(api, 'multisigs').entries(accountId)).then(schema.parse);
  },
};
