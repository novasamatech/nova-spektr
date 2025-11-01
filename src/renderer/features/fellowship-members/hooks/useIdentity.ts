import { type ChainId } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useResource } from '@/shared/query';
import { identity } from '@/domains/network';

export const useIdentity = (account: AccountId, chainId?: ChainId) => {
  return useResource(identity.resource, {
    params: { chainId, accounts: [account] },
    defaultValue: null,
    map: cache => chainId && cache[chainId]?.[account],
    filter: nullable,
  });
};
