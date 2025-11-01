import { type ApiPromise } from '@polkadot/api';

import { type CollectivePalletsType, memberService } from '@/domains/collectives';

import { useMembers } from './useMembers';

export const useCoreMembers = (pallet: CollectivePalletsType, api?: ApiPromise) => {
  const { data, pending } = useMembers(pallet, api);

  const coreMembers = data.filter(memberService.isCoreMember);

  return { data: coreMembers, pending };
};
