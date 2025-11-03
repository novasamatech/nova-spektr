import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import { type MembersSubscribeParams, membersSubscriptionResource } from './resource';
import { memberService } from './service';

export const useMembers = (params: NullableMap<MembersSubscribeParams>) => {
  return useResource(membersSubscriptionResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: [],
    map: (cache, { palletType, api }) => cache[palletType]?.[api.genesisHash.toHex()],
  });
};

export const useCoreMembers = (params: NullableMap<MembersSubscribeParams>) => {
  const { data, pending } = useMembers(params);

  return { data: data.filter(memberService.isCoreMember), pending };
};
