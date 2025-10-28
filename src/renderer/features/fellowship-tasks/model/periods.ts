import { combine, sample } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { evidence, evidenceService, memberService } from '@/domains/collectives';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

import { fellowshipTasksFeature } from './feature';
import { fellowship } from './fellowship';
import { memberProfile } from './memberProfile';

// periods

const $periods = fellowship.$store.map(store => store?.evidencePeriods ?? null);

const $endPromotionPeriod = combine(memberProfile.$member, $periods, (member, periods) => {
  if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member)) return null;
  return evidenceService.getEndPromotionBlock(member, periods);
});

const $leftToPromotion = combine(
  { periods: $periods, currentBlock: fellowshipNetwork.$currentBlock, member: memberProfile.$member },
  ({ periods, currentBlock, member }) => {
    if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member) || nullable(currentBlock))
      return null;
    return evidenceService.getBlockUntilNextPromotion(member, periods, currentBlock);
  },
);

const $endDemotionPeriod = combine(memberProfile.$member, $periods, (member, periods) => {
  if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member)) return null;
  return evidenceService.getEndDemotionBlock(member, periods);
});

const $leftToDemotion = combine(
  { periods: $periods, currentBlock: fellowshipNetwork.$currentBlock, member: memberProfile.$member },
  ({ periods, currentBlock, member }) => {
    if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member) || nullable(currentBlock))
      return null;
    return evidenceService.getBlocksUntilDemotion(member, periods, currentBlock);
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
  $endPromotionPeriod,
  $endDemotionPeriod,
  $leftToPromotion,
  $leftToDemotion,
};
