import { combine, createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

import { nullable } from '@/shared/lib/utils';
import { evidence, evidenceService, memberService } from '@/domains/collectives';

import { block } from './block';
import { fellowshipProfileFeature } from './feature';
import { fellowship } from './fellowship';
import { profile } from './profile';

// evidences

const $evidences = fellowship.$store.map(s => s?.evidence ?? []);

const $memberEvidence = combine(profile.$member, $evidences, (member, evidences) => {
  return member ? (evidences.find(e => e.accountId === member.accountId) ?? null) : null;
});

const $hasPromotionEvidence = $memberEvidence.map(x => x?.wish === 'Promotion');

// periods

const $periods = fellowship.$store.map(store => store?.evidencePeriods ?? null);

const $promotionPeriod = combine(profile.$member, $periods, (member, periods) => {
  if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member)) return null;
  return evidenceService.getPromotionPeriod(member, periods);
});

const $leftToPromotion = combine(
  { promotionPeriod: $promotionPeriod, currentBlock: block.$currentBlock, member: profile.$member },
  ({ promotionPeriod, currentBlock, member }) => {
    if (nullable(promotionPeriod) || nullable(member) || !memberService.isCoreMember(member)) return null;

    const gone = currentBlock - member.lastPromotion;
    return Math.max(0, promotionPeriod - gone);
  },
);

// requesting data

const evendenceRequested = fellowshipProfileFeature.running.filterMap(({ api, palletType, chain, member }) => {
  if (!member) return;
  return {
    api,
    palletType,
    chain,
    accountId: member.accountId,
  };
});

sample({
  clock: evendenceRequested,
  target: [evidence.request, evidence.requestPeriods],
});

// attention message

const $showAttention = createStore(true);
const hideAttention = createEvent();

persist({
  key: 'fellowship-evidence-show-attention',
  store: $showAttention,
  sync: true,
});

sample({
  clock: hideAttention,
  fn: () => false,
  target: $showAttention,
});

export const evidenceInfo = {
  $leftToPromotion,
  $hasPromotionEvidence,
};
