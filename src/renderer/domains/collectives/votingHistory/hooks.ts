import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import {
  type RequestAllVotesParams,
  type RequestVotesParams,
  allVotesResource,
  votesResource,
  votingSubscriptionResource,
} from './resource';

export const useVotes = (params: NullableMap<RequestVotesParams>) => {
  const normalizedParams = nonNullableMap(params) ? params : null;

  useResource(votingSubscriptionResource, {
    params:
      normalizedParams && normalizedParams.accounts.length > 0 && normalizedParams.referendums.length > 0
        ? {
            palletType: normalizedParams.palletType,
            api: normalizedParams.api,
            chainId: normalizedParams.chain.chainId,
            accounts: normalizedParams.accounts,
          }
        : null,
    defaultValue: [],
    map: () => [],
  });

  return useResource(votesResource, {
    params: normalizedParams,
    defaultValue: [],
    map(cache, { palletType, chain, accounts, referendums }) {
      const allVotes = cache[palletType]?.[chain.chainId];
      if (allVotes) {
        return allVotes.filter(v => accounts.includes(v.accountId) && referendums.includes(v.referendumId));
      }
    },
  });
};

export const useAllVotes = (params: NullableMap<RequestAllVotesParams>) => {
  return useResource(allVotesResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: [],
    map(cache, { palletType, chain }) {
      return cache[palletType]?.[chain.chainId];
    },
  });
};
