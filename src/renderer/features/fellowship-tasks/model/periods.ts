import { combine, sample } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { evidence, evidenceService, memberService } from '@/domains/collectives';

import { block } from './block';
import { fellowshipTasksFeature } from './feature';
import { fellowship } from './fellowship';
import { memberProfile } from './memberProfile';

// periods

const $periods = fellowship.$store.map(store => store?.evidencePeriods ?? null);

const $promotionPeriod = combine(memberProfile.$member, $periods, (member, periods) => {
  if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member)) return null;
  return evidenceService.getPromotionPeriod(member, periods);
});

const $leftToPromotion = combine(
  { promotionPeriod: $promotionPeriod, currentBlock: block.$currentBlock, member: memberProfile.$member },
  ({ promotionPeriod, currentBlock, member }) => {
    if (nullable(promotionPeriod) || nullable(member) || !memberService.isCoreMember(member)) return null;

    const gone = currentBlock - member.lastPromotion;
    return Math.max(0, promotionPeriod - gone);
  },
);

const $demotionPeriod = combine(memberProfile.$member, $periods, (member, periods) => {
  if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member)) return null;
  return evidenceService.getDemotionPeriod(member, periods);
});

const $leftToDemotion = combine(
  { demotionPeriod: $demotionPeriod, currentBlock: block.$currentBlock, member: memberProfile.$member },
  ({ demotionPeriod, currentBlock, member }) => {
    if (nullable(demotionPeriod) || nullable(member) || !memberService.isCoreMember(member)) return null;

    const gone = currentBlock - member.lastProof;
    return Math.max(0, demotionPeriod - gone);
  },
);

// requesting data

const periodRequested = fellowshipTasksFeature.running.filterMap(({ api, palletType, chain }) => {
  return {
    api,
    palletType,
    chain,
  };
});

sample({
  clock: periodRequested,
  target: evidence.requestPeriods,
});

export const periods = {
  $leftToPromotion,
  $leftToDemotion,
};
