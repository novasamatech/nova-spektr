import { type ApiPromise } from '@polkadot/api';

import { useResource } from '@/shared/query';
import { type CollectivePalletsType, member } from '@/domains/collectives';

export const useMembers = (pallet: CollectivePalletsType, api?: ApiPromise) => {
  return useResource(member.resource, {
    params: api ? { palletType: pallet, api } : null,
    defaultValue: [],
    map: (cache, params) => cache[params.palletType]?.[params.api.genesisHash.toHex()],
  });
};
