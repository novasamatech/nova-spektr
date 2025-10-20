import { type ApiPromise } from '@polkadot/api';

import { useResource } from '@/shared/resource2';
import { member, memberService } from '@/domains/collectives';

export const useCoreMembers = (api?: ApiPromise) => {
  const { data, pending } = useResource(member.resource, {
    params: api ? { api, palletType: 'fellowship' } : null,
    defaultValue: [],
    map: (cache, params) => cache['fellowship']?.[params.api.genesisHash.toHex()],
  });

  const coreMembers = data.filter(memberService.isCoreMember);

  return { data: coreMembers, pending };
};
