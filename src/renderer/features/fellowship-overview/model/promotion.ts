import { combine } from 'effector';
import { and, or } from 'patronum';

import { nullable } from '@/shared/lib/utils';
import { type CoreMember, type Member, evidenceService, memberService } from '@/domains/collectives';
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
const $feed = fellowship.$store.map(store => store?.feed ?? []);
const $member = fellowshipMember.$currentMember;
const $currentBlock = fellowshipNetwork.$currentBlock;

const $leftToPromotion = combine(
  { periods: $periods, currentBlock: $currentBlock, member: $member, feed: $feed },
  ({ periods, currentBlock, member, feed }) => {
    if (nullable(periods) || !isCoreMember(member) || nullable(currentBlock)) {
      return null;
    }

    const memberWithPromotionStart = evidenceService.getMemberWithPromotionStart(member, feed);
    if (nullable(memberWithPromotionStart)) {
      return null;
    }

    return evidenceService.getBlockUntilNextPromotion(memberWithPromotionStart, periods, currentBlock);
  },
);

const $promotionWindow = combine(
  { member: $member, periods: $periods, feed: $feed, currentBlock: $currentBlock },
  ({ member, periods, feed, currentBlock }) => {
    if (!isCoreMember(member) || nullable(periods) || nullable(currentBlock)) {
      return null;
    }

    const memberWithPromotionStart = evidenceService.getMemberWithPromotionStart(member, feed);
    if (nullable(memberWithPromotionStart)) {
      return null;
    }

    return evidenceService.getPromotionWindow(memberWithPromotionStart, periods);
  },
);

const $promotionProgress = combine(
  {
    member: $member,
    periods: $periods,
    currentBlock: $currentBlock,
    leftToPromotion: $leftToPromotion,
    feed: $feed,
    promotionWindow: $promotionWindow,
  },
  ({ member, periods, currentBlock, leftToPromotion, feed, promotionWindow }): PromotionProgress => {
    if (!isCoreMember(member) || nullable(periods) || nullable(currentBlock) || nullable(leftToPromotion)) {
      return null;
    }

    const memberWithPromotionStart = evidenceService.getMemberWithPromotionStart(member, feed);
    if (nullable(memberWithPromotionStart)) {
      return null;
    }

    const promotionPeriod = evidenceService.getPromotionPeriod(memberWithPromotionStart, periods);
    const windowStart = promotionWindow?.from ?? memberWithPromotionStart.lastPromotion;
    const blocksPassed = currentBlock - windowStart;
    const calculatedProgress = (blocksPassed / promotionPeriod) * 100;
    const progressPercentage = leftToPromotion === 0 ? 100 : Math.min(100, calculatedProgress);

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

const $pendingMember = and(fellowshipNetwork.$isConnecting, $member.map(nullable));

const $isLoading = or(
  $pendingMember,
  fellowshipOverviewFeature.isStarting,
  fellowshipNetwork.$network.map(nullable),
  $currentBlock.map(nullable),
  fellowship.$store.map(nullable),
);

export const promotion = {
  $leftToPromotion,
  $promotionWindow,
  $promotionProgress,
  $currentRank,
  $currentBlock,
  $isLoading,
};
