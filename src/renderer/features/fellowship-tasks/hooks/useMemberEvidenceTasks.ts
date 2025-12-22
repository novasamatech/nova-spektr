import { useMemo } from 'react';

import { nullable } from '@/shared/lib/utils';
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

    if (nullable(member) || !memberService.isCoreMember(member)) {
      return tasks;
    }

    const task = {
      id: 'evidence',
      weight: 1,
      group: 'personal',
      meta: { transaction: operations['evidence']?.coreTx ?? null, tags: [] },
    } as const;

    if (shouldRetentionRequest && !hasRetentionEvidence && memberService.shouldProve(member)) {
      tasks.push({ ...task, body: RequestRetention });
    } else if (
      memberService.canPromote(member) &&
      promotionCountdown?.canSubmitPromotionEvidence &&
      !hasPromotionEvidence
    ) {
      tasks.push({ ...task, body: RequestPromotion });
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
