import { useMemo } from 'react';

import { nullable } from '@/shared/lib/utils';
import { useFeed } from '@/domains/collectives';
import { useFellowshipMemberEvidence } from '@/aggregates/fellowship-member';
import { useFellowshipChain } from '@/aggregates/fellowship-network';

export const useRetentionEvidenceSubmissionDate = () => {
  const chain = useFellowshipChain();

  const { data: retentionEvidence, pending: retentionEvidencePending } = useFellowshipMemberEvidence();
  const { data: feed, pending: feedPending } = useFeed({ palletType: 'fellowship', chain });

  const submissionDate = useMemo(() => {
    if (nullable(retentionEvidence)) return null;

    return (
      feed?.find(e => e.accountId === retentionEvidence.accountId && e.type === 'requested' && e.wish === 'Retention')
        ?.at ?? null
    );
  }, [retentionEvidence, feed]);

  return { data: submissionDate, pending: retentionEvidencePending || feedPending };
};
