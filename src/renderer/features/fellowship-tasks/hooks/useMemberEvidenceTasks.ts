import { useMemo } from 'react';

import { nonNullable } from '@/shared/lib/utils';
import { memberService } from '@/domains/collectives';
import {
  useFellowshipMember,
  useFellowshipMemberEvidence,
  useFellowshipMemberLeftToDemotion,
} from '@/aggregates/fellowship-member';
import { usePromotionCountdown } from '@/aggregates/fellowship-promotion';
import { useRetentionRequest } from '@/aggregates/fellowship-retention';
import { RequestPromotion } from '../components/tasks/RequestPromotion';
import { RequestRetention } from '../components/tasks/RequestRetention';
import { type TaskDescription } from '../types';

import { useMemberBasketOperations } from './useMemberBasketOperations';

export const useMemberEvidenceTasks = () => {
  const { data: operations, pending: pendingOperations } = useMemberBasketOperations();
  const { data: member, pending: pendingMember } = useFellowshipMember();
  const { data: evidence, pending: pendingEvidence } = useFellowshipMemberEvidence();
  const { data: leftToDemotion, pending: pendingDemotion } = useFellowshipMemberLeftToDemotion();
  const { data: promotionCountdown, pending: pendingPromotion } = usePromotionCountdown();
  const { data: shouldRetentionRequest } = useRetentionRequest();

  const hasPromotionEvidence = evidence?.wish === 'Promotion';
  const hasRetentionEvidence = evidence?.wish === 'Retention';

  const tasks = useMemo(() => {
    const tasks: TaskDescription[] = [];

    if (nonNullable(member) && memberService.isCoreMember(member)) {
      if (shouldRetentionRequest && !hasRetentionEvidence) {
        tasks.push({
          id: 'evidence',
          weight: 1,
          group: 'personal',
          body: RequestRetention,
          meta: { transaction: operations['evidence']?.coreTx ?? null, tags: [] },
        });
      } else if (
        memberService.canPromote(member) &&
        promotionCountdown?.canSubmitPromotionEvidence &&
        !hasPromotionEvidence
      ) {
        tasks.push({
          id: 'evidence',
          weight: 1,
          group: 'personal',
          body: RequestPromotion,
          meta: { transaction: operations['evidence']?.coreTx ?? null, tags: [] },
        });
      }
    }
    return tasks;
  }, [
    operations,
    member,
    leftToDemotion,
    promotionCountdown,
    hasPromotionEvidence,
    hasRetentionEvidence,
    shouldRetentionRequest,
  ]);

  return {
    data: tasks,
    pending: pendingOperations || pendingMember || pendingEvidence || pendingDemotion || pendingPromotion,
  };
};
