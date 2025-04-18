import { type ApiPromise } from '@polkadot/api';
import { zipWith } from 'lodash';

import { type ChainId } from '@/shared/core';
import { nullable, withTimeout } from '@/shared/lib/utils';
import { identityPallet } from '@/shared/pallet/identity';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createRemoteResource } from '@/shared/resource';

import { type AccountIdentity } from './types';

const LOADING_TIMEOUT = 15_000;

export type ResourceParams = {
  accounts: AccountId[];
  chainId: ChainId;
  api: ApiPromise;
};

export const resource = createRemoteResource<ResourceParams, Record<AccountId, AccountIdentity>>({
  pool: ({ chainId }) => chainId,
  cache: {
    key: ({ chainId, accounts }) => `${chainId}:${accounts.join(',')}`,
    ttl: Number.POSITIVE_INFINITY,
  },
  async fn({ api, chainId, accounts }) {
    if (accounts.length === 0 || nullable(api)) return {};

    const subIdentities = await withTimeout(identityPallet.storage.superOf(api, accounts), LOADING_TIMEOUT, null);
    if (nullable(subIdentities)) return {};

    const parentAccounts = subIdentities.map(({ account, identity }) => (nullable(identity) ? account : identity[0]));
    const parentIdentities = await withTimeout(
      identityPallet.storage.identityOf(api, parentAccounts),
      LOADING_TIMEOUT,
      null,
    );

    if (nullable(parentIdentities)) return {};

    const identities = zipWith(subIdentities, parentIdentities, (sub, parent) => ({ sub, parent }));

    const result: Record<AccountId, AccountIdentity> = {};

    for (const { sub, parent } of identities) {
      if (nullable(parent?.identity)) continue;
      const parentIdentity = Array.isArray(parent.identity) ? parent.identity[0] : parent.identity;

      result[sub.account] = {
        chainId,
        accountId: sub.account,
        subName: sub.identity?.[1],
        name: parentIdentity.info.display,
        email: parentIdentity.info.email,
        image: parentIdentity.info.image,
        github: parentIdentity.info.github,
        matrix: parentIdentity.info.matrix,
      };

      if (sub.account !== parent.account) {
        result[parent.account] = {
          chainId,
          accountId: parent.account,
          subName: sub.identity?.[1],
          name: parentIdentity.info.display,
          email: parentIdentity.info.email,
          image: parentIdentity.info.image,
          matrix: parentIdentity.info.matrix,
        };
      }
    }

    return result;
  },
});
