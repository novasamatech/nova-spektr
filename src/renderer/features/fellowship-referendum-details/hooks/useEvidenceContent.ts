import { type Referendum, useEvidencesContent } from '@/domains/collectives';
import { useFellowshipApi } from '@/aggregates/fellowship-network';

import { useProposer } from './useProposer';
import { useMetadata } from './useReferendumMeta';

export const useEvidenceContent = (referendum: Referendum | null) => {
  const proposer = useProposer(referendum);
  const api = useFellowshipApi();

  const { data: metadata, pending: pendingMetadata } = useMetadata(referendum);
  const { data: content, pending: pendingContent } = useEvidencesContent({
    palletType: 'fellowship',
    api,
    accountId: proposer,
    blockHash: metadata?.blockHash,
  });

  return { data: content, pending: pendingMetadata || pendingContent };
};
