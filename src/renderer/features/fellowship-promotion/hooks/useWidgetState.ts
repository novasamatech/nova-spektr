import { useMemo } from 'react';

import { nonNullable, nullable } from '@/shared/lib/utils';
import { useMemberPromotionReferendum } from '@/aggregates/fellowship-member';
import { usePromotionCountdown } from '@/aggregates/fellowship-promotion';

import { usePromotionEvidence } from './usePromotionEvidence';

export enum PromotionWidgetState {
  WAITING_OPPORTUNITY = 'waiting_opportunity',
  EVIDENCE_CAN_BE_SUBMITTED = 'evidence_can_be_submitted',
  EVIDENCE_SUBMITTED = 'evidence_submitted',
  REFERENDUM_CREATED = 'referendum_created',
}

export const useWidgetState = () => {
  const { data: countdown, pending: countdownPending } = usePromotionCountdown();
  const { data: evidence, pending: evidencePending } = usePromotionEvidence();
  const { data: referendum, pending: referendumPending } = useMemberPromotionReferendum();

  const hasPromotionEvidence = evidence?.wish === 'Promotion';

  const state = useMemo(() => {
    if (nullable(countdown) || !countdown.canSubmitPromotionEvidence) {
      return PromotionWidgetState.WAITING_OPPORTUNITY;
    }

    if (nonNullable(referendum)) {
      return PromotionWidgetState.REFERENDUM_CREATED;
    }

    if (hasPromotionEvidence) {
      return PromotionWidgetState.EVIDENCE_SUBMITTED;
    }

    return PromotionWidgetState.EVIDENCE_CAN_BE_SUBMITTED;
  }, [countdown, hasPromotionEvidence, referendum]);

  return {
    data: state,
    pending: countdownPending || evidencePending || referendumPending,
  };
};
