import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import { type RequestAllVotesParams, type RequestVotesParams, allVotesResource, votesResource } from './resource';

export const useVotes = (params: NullableMap<RequestVotesParams>) => {
  return useResource(votesResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: [],
    map(cache, { palletType, chain, accounts, referendums }) {
      const allVotes = cache[palletType]?.[chain.chainId] ?? [];
      return allVotes.filter(v => accounts.includes(v.accountId) && referendums.includes(v.referendumId));
    },
  });
};

export const useAllVotes = (params: NullableMap<RequestAllVotesParams>) => {
  return useResource(allVotesResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: [],
    map(cache, { palletType, chain }) {
      return cache[palletType]?.[chain.chainId] ?? [];
    },
  });
};
