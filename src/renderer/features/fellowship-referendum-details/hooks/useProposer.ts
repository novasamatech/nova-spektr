import { useMemo } from 'react';

import { nonNullable } from '@/shared/lib/utils';
import { type Evidence, type Referendum, referendumService, useMembers } from '@/domains/collectives';
import { useFellowshipApi } from '@/aggregates/fellowship-network';

export const useProposer = (referendum: Referendum | null, evidence?: Evidence | null) => {
  const api = useFellowshipApi();
  const { data: members, pending } = useMembers({ palletType: 'fellowship', api });

  const proposerMember = useMemo(() => {
    if (nonNullable(referendum) && referendumService.isOngoing(referendum)) {
      const proposer = referendumService.getProposer(referendum);
      return members.find(m => m.accountId === proposer) ?? null;
    }

    if (nonNullable(evidence)) {
      return members.find(m => m.accountId === evidence?.accountId) ?? null;
    }

    return null;
  }, [referendum, evidence, members]);

  return { data: proposerMember, pending };
};
