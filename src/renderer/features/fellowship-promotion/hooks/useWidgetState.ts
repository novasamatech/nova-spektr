import { useMemo } from 'react';

import { nonNullable, nullable } from '@/shared/lib/utils';
import { useMemberPromotionReferendum } from '@/aggregates/fellowship-member';

import { useLeftToPromotion } from './useLeftToPromotion';
import { usePromotionEvidence } from './usePromotionEvidence';

export enum PromotionWidgetState {
  WAITING_OPPORTUNITY = 'waiting_opportunity',
  EVIDENCE_CAN_BE_SUBMITTED = 'evidence_can_be_submitted',
  EVIDENCE_SUBMITTED = 'evidence_submitted',
  REFERENDUM_CREATED = 'referendum_created',
}

export const useWidgetState = () => {
  const { data: leftToPromotion, pending: leftPending } = useLeftToPromotion();
  const { data: hasPromotionEvidence, pending: evidencePending } = usePromotionEvidence();
  const { data: referendum, pending: referendumPending } = useMemberPromotionReferendum();

  const state = useMemo(() => {
    if (nullable(leftToPromotion) || leftToPromotion > 0) {
      return PromotionWidgetState.WAITING_OPPORTUNITY;
    }

    if (nonNullable(referendum)) {
      return PromotionWidgetState.REFERENDUM_CREATED;
    }

    if (nonNullable(hasPromotionEvidence)) {
      return PromotionWidgetState.EVIDENCE_SUBMITTED;
    }

    return PromotionWidgetState.EVIDENCE_CAN_BE_SUBMITTED;
  }, [leftToPromotion, hasPromotionEvidence, referendum]);

  return {
    data: state,
    pending: leftPending || evidencePending || referendumPending,
  };
};
