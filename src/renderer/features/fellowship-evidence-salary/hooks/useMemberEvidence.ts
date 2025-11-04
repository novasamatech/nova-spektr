import { useMemo } from 'react';

import { useEvidences } from '@/domains/collectives';
import { useFellowshipMember } from '@/aggregates/fellowship-member';
import { useFellowshipApi } from '@/aggregates/fellowship-network';

export const useMemberEvidence = () => {
  const api = useFellowshipApi();

  const { data: member, pending: pendingMember } = useFellowshipMember();
  const { data: evidences, pending: pendingEvidences } = useEvidences({
    palletType: 'fellowship',
    api,
    accounts: member ? [member.accountId] : null,
  });

  const evidence = useMemo(() => {
    return member ? (evidences.find(e => e.accountId === member.accountId) ?? null) : null;
  }, [member, evidences]);

  return { data: evidence, pending: pendingMember || pendingEvidences };
};
