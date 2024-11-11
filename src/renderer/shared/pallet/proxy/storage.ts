import { type ApiPromise } from '@polkadot/api';
import { zipWith } from 'lodash';
import { z } from 'zod';

import { substrateRpcPool } from '@/shared/api/substrate-helpers';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';

import { proxyAnnouncement, proxyProxyDefinition } from './schema';

const getQuery = (api: ApiPromise, name: string) => {
  const pallet = api.query['proxy'];
  if (!pallet) {
    throw new TypeError(`proxy pallet not found in ${api.runtimeChain.toString()} chain`);
  }

  const query = pallet[name];

  if (!query) {
    throw new TypeError(`${name} query not found`);
  }

  return query;
};

export const storage = {
  /**
   * The announcements made by the proxy (key).
   */
  announcements(api: ApiPromise, accounts?: AccountId[]) {
    const recordSchema = pjsSchema.tupleMap(
      ['announcements', pjsSchema.vec(proxyAnnouncement)],
      ['deposit', pjsSchema.u64],
    );

    if (accounts && accounts.length > 0) {
      const schema = pjsSchema.vec(recordSchema);

      return substrateRpcPool
        .call(() => getQuery(api, 'announcements').multi(accounts))
        .then(schema.parse)
        .then(result => zipWith(accounts, result, (account, value) => ({ account, value })));
    }

    const schema = pjsSchema.vec(
      pjsSchema.tupleMap(
        ['account', pjsSchema.storageKey(pjsSchema.accountId).transform(([account]) => account)],
        ['value', recordSchema],
      ),
    );

    return substrateRpcPool.call(() => getQuery(api, 'announcements').entries()).then(schema.parse);
  },

  /**
   * The set of account proxies. Maps the account which has delegated to the
   * accounts which are being delegated to, together with the amount held on
   * deposit.
   */
  proxies(api: ApiPromise, accounts?: AccountId[]) {
    const recordSchema = pjsSchema.tupleMap(
      ['accounts', pjsSchema.vec(proxyProxyDefinition)],
      ['deposit', z.union([pjsSchema.u128, pjsSchema.u64])],
    );

    if (accounts && accounts.length > 0) {
      const schema = pjsSchema.vec(recordSchema);

      return substrateRpcPool
        .call(() => getQuery(api, 'proxies').entries())
        .then(schema.parse)
        .then(result => zipWith(accounts, result, (account, value) => ({ account, value })));
    }

    const schema = pjsSchema.vec(
      pjsSchema.tupleMap(
        ['account', pjsSchema.storageKey(pjsSchema.accountId).transform(([accountId]) => accountId)],
        ['value', recordSchema],
      ),
    );

    return substrateRpcPool.call(() => getQuery(api, 'proxies').entries()).then(schema.parse);
  },
};
