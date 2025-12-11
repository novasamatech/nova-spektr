import { useMemo } from 'react';

import { nullable } from '@/shared/lib/utils';
import { evidenceService, memberService, useEvidencePeriod, useFeed } from '@/domains/collectives';
import { useBlock, useBlockTime } from '@/domains/network';
import { useFellowshipMember } from '@/aggregates/fellowship-member';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';

import { MS_PER_DAY, PROMOTION_SUBMISSION_THRESHOLD_DAYS } from './constants';

export type PromotionCountdown = {
  daysLeft: number;
  canSubmitPromotionEvidence: boolean;
};

export const useLeftToPromotion = () => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();

  const { data: member, pending: memberPending } = useFellowshipMember();
  const { data: periods, pending: periodPending } = useEvidencePeriod({ palletType: 'fellowship', api, chain });
  const { data: currentBlock, pending: blockPending } = useBlock(api);
  const { data: feed, pending: feedPending } = useFeed({ palletType: 'fellowship', chain });

  const leftToPromotion = useMemo(() => {
    if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member) || nullable(currentBlock)) {
      return null;
    }

    const memberWithPromotionStart = evidenceService.getMemberWithPromotionStart(member, feed);
    if (nullable(memberWithPromotionStart)) {
      return null;
    }

    return evidenceService.getBlockUntilNextPromotion(memberWithPromotionStart, periods, currentBlock);
  }, [periods, member, currentBlock, feed]);

  return { data: leftToPromotion, pending: memberPending || periodPending || blockPending || feedPending };
};

export const usePromotionCountdown = () => {
  const api = useFellowshipApi();
  const { data: leftToPromotion, pending: leftPending } = useLeftToPromotion();
  const { data: blockTime, pending: blockPending } = useBlockTime(api);

  const countdown = useMemo<PromotionCountdown | null>(() => {
    if (nullable(leftToPromotion) || nullable(blockTime)) return null;

    const blockTimeMs = blockTime.toNumber();
    if (!Number.isFinite(blockTimeMs) || blockTimeMs <= 0) return null;

    const daysLeft = (leftToPromotion * blockTimeMs) / MS_PER_DAY;
    const canSubmitPromotionEvidence = daysLeft <= PROMOTION_SUBMISSION_THRESHOLD_DAYS || leftToPromotion <= 0;

    return {
      daysLeft,
      canSubmitPromotionEvidence,
    };
  }, [leftToPromotion, blockTime]);

  return {
    data: countdown,
    pending: leftPending || blockPending,
  };
};
