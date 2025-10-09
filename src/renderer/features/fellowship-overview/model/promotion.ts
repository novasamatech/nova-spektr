import { combine } from 'effector';
import { and, or } from 'patronum';

import { nullable } from '@/shared/lib/utils';
import { type CoreMember, type Member, evidenceService, member, memberService } from '@/domains/collectives';
import { fellowshipMember } from '@/aggregates/fellowship-member';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

import { fellowshipOverviewFeature } from './feature';
import { fellowship } from './fellowship';

const isCoreMember = (member: Member | null): member is CoreMember => {
  return !nullable(member) && memberService.isCoreMember(member);
};

type PromotionProgress = {
  progressPercentage: number;
  blocksPassed: number;
  promotionPeriod: number;
  leftToPromotion: number;
} | null;

const $periods = fellowship.$store.map(store => store?.evidencePeriods ?? null);
const $member = fellowshipMember.$currentMember;
const $currentBlock = fellowshipNetwork.$currentBlock;

const $leftToPromotion = combine(
  { periods: $periods, currentBlock: $currentBlock, member: $member },
  ({ periods, currentBlock, member }) => {
    if (nullable(periods) || !isCoreMember(member) || nullable(currentBlock)) {
      return null;
    }

    return evidenceService.getBlockUntilNextPromotion(member, periods, currentBlock);
  },
);

const $promotionPeriod = combine({ member: $member, periods: $periods }, ({ member, periods }) => {
  if (!isCoreMember(member) || nullable(periods)) {
    return null;
  }

  return evidenceService.getPromotionPeriod(member, periods);
});

const $promotionProgress = combine(
  { member: $member, periods: $periods, currentBlock: $currentBlock, leftToPromotion: $leftToPromotion },
  ({ member, periods, currentBlock, leftToPromotion }): PromotionProgress => {
    if (!isCoreMember(member) || nullable(periods) || nullable(currentBlock) || nullable(leftToPromotion)) {
      return null;
    }

    const promotionPeriod = evidenceService.getPromotionPeriod(member, periods);
    const blocksPassed = currentBlock - member.lastPromotion;
    const progressPercentage = Math.min(100, (blocksPassed / promotionPeriod) * 100);

    return {
      progressPercentage,
      blocksPassed,
      promotionPeriod,
      leftToPromotion,
    };
  },
);

const $currentRank = $member.map(member => {
  if (!isCoreMember(member)) {
    return null;
  }

  return member.rank;
});

const $pendingMember = and(or(member.pending, fellowshipNetwork.$isConnecting), $member.map(nullable));

const $isLoading = or(
  $pendingMember,
  fellowshipOverviewFeature.isStarting,
  fellowshipNetwork.$network.map(nullable),
  $currentBlock.map(nullable),
  fellowship.$store.map(nullable),
);

export const promotion = {
  $leftToPromotion,
  $promotionPeriod,
  $promotionProgress,
  $currentRank,
  $currentBlock,
  $isLoading,
};
