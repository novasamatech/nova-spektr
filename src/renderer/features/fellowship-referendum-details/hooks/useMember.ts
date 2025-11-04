import { useMemo } from 'react';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useMembers } from '@/domains/collectives';
import { useFellowshipApi } from '@/aggregates/fellowship-network';

export const useMember = (accountId: AccountId | null) => {
  const api = useFellowshipApi();
  const { data: members, pending } = useMembers({ palletType: 'fellowship', api });

  const member = useMemo(() => {
    return members.find(x => x.accountId === accountId);
  }, [members, accountId]);

  return { data: member, pending };
};
