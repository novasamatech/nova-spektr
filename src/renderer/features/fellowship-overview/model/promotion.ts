import { combine } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { evidenceService, memberService } from '@/domains/collectives';
import { fellowshipMember } from '@/aggregates/fellowship-member';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

import { fellowship } from './fellowship';

const $periods = fellowship.$store.map(store => store?.evidencePeriods ?? null);
const $member = fellowshipMember.$currentMember;
const $currentBlock = fellowshipNetwork.$currentBlock;

const $leftToPromotion = combine(
  { periods: $periods, currentBlock: $currentBlock, member: $member },
  ({ periods, currentBlock, member }) => {
    if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member) || nullable(currentBlock)) {
      return null;
    }

    return evidenceService.getBlockUntilNextPromotion(member, periods, currentBlock);
  },
);

const $promotionPeriod = combine($member, $periods, (member, periods) => {
  if (nullable(member) || nullable(periods) || !memberService.isCoreMember(member)) {
    return null;
  }

  return evidenceService.getPromotionPeriod(member, periods);
});

const $promotionProgress = combine(
  { member: $member, periods: $periods, currentBlock: $currentBlock, leftToPromotion: $leftToPromotion },
  ({ member, periods, currentBlock, leftToPromotion }) => {
    if (
      nullable(member) ||
      nullable(periods) ||
      nullable(currentBlock) ||
      nullable(leftToPromotion) ||
      !memberService.isCoreMember(member)
    ) {
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

const $currentRank = combine($member, member => {
  if (nullable(member) || !memberService.isCoreMember(member)) {
    return null;
  }

  return member.rank;
});

const $isLoading = combine(
  {
    isConnecting: fellowshipNetwork.$isConnecting,
    network: fellowshipNetwork.$network,
    currentBlock: $currentBlock,
    member: $member,
    fellowshipStore: fellowship.$store,
  },
  ({ isConnecting, network, currentBlock, member, fellowshipStore }) => {
    return isConnecting || nullable(network) || nullable(currentBlock) || nullable(member) || nullable(fellowshipStore);
  },
);

export const promotion = {
  $leftToPromotion,
  $promotionPeriod,
  $promotionProgress,
  $currentRank,
  $currentBlock,
  $isLoading,
};
