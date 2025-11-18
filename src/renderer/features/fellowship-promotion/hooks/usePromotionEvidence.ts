import { useMemo } from 'react';

import { nullable } from '@/shared/lib/utils';
import { useFeed } from '@/domains/collectives';
import { useFellowshipMemberEvidence } from '@/aggregates/fellowship-member';
import { useFellowshipChain } from '@/aggregates/fellowship-network';

export const usePromotionEvidence = () => {
  const { data: evidence, pending: evidencePending } = useFellowshipMemberEvidence();

  const promotionEvidence = useMemo(() => {
    if (nullable(evidence)) return null;
    return evidence.wish === 'Promotion' ? evidence : null;
  }, [evidence]);

  return { data: promotionEvidence, pending: evidencePending };
};

export const usePromotionEvidenceSubmissionDate = () => {
  const chain = useFellowshipChain();

  const { data: promotionEvidence, pending: evidencePending } = usePromotionEvidence();
  const { data: feed, pending: feedPending } = useFeed({ palletType: 'fellowship', chain });

  const submissionDate = useMemo(() => {
    if (nullable(promotionEvidence)) return null;

    return (
      feed?.find(e => e.accountId === promotionEvidence.accountId && e.type === 'requested' && e.wish === 'Promotion')
        ?.at ?? null
    );
  }, [promotionEvidence, feed]);

  return { data: submissionDate, pending: evidencePending || feedPending };
};
