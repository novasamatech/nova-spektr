import { type Evidence, type Referendum, useEvidencesContent } from '@/domains/collectives';
import { useFellowshipApi } from '@/aggregates/fellowship-network';

import { useProposer } from './useProposer';

export const useEvidenceContent = (referendum: Referendum | null, evidence?: Evidence | null) => {
  const api = useFellowshipApi();

  const { data: proposer, pending: pendingProposer } = useProposer(referendum, evidence);
  const { data: content, pending: pendingContent } = useEvidencesContent({
    palletType: 'fellowship',
    api,
    accountId: proposer?.accountId,
  });

  return { data: content, pending: pendingProposer || pendingContent };
};
