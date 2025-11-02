import { type ApiPromise } from '@polkadot/api';

import { useResource } from '@/shared/query';
import { type CollectivePalletsType } from '../_lib/types';

import { membersSubscription } from './resource';
import { memberService } from './service';

export const useMembers = (palletType: CollectivePalletsType, api?: ApiPromise) => {
  return useResource(membersSubscription, {
    params: api ? { palletType, api } : null,
    defaultValue: [],
    map: (cache, { palletType, api }) => cache[palletType]?.[api.genesisHash.toHex()],
  });
};

export const useCoreMembers = (pallet: CollectivePalletsType, api?: ApiPromise) => {
  const { data, pending } = useMembers(pallet, api);

  return { data: data.filter(memberService.isCoreMember), pending };
};
