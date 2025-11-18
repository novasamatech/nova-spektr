import { useMemo } from 'react';

import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
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

export const useMember = (params: NullableMap<MembersSubscribeParams & { accountId: AccountId }>) => {
  const { data, pending } = useMembers(params);

  const member = useMemo(() => {
    if (params.accountId) {
      return data.find(m => m.accountId === params.accountId) ?? null;
    }

    return null;
  }, [data, params.accountId]);

  return { data: member, pending };
};
