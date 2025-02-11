import { combine, createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

import { nullable } from '@/shared/lib/utils';
import { evidence, evidenceService, memberService } from '@/domains/collectives';

import { block } from './block';
import { fellowshipSalaryFeature } from './feature';
import { fellowship } from './fellowship';
import { profile } from './profile';

// evidences

const $evidences = fellowship.$store.map(s => s?.evidence ?? []);

const $memberEvidence = combine(profile.$member, $evidences, (member, evidences) => {
  return member ? (evidences.find(e => e.accountId === member.accountId) ?? null) : null;
});

const $hasRetentionEvidence = $memberEvidence.map(x => x?.wish === 'Retention');
const $hasPromotionEvidence = $memberEvidence.map(x => x?.wish === 'Promotion');

// periods

const $periods = fellowship.$store.map(store => store?.evidencePeriods ?? null);

const $promotionPeriod = combine(profile.$member, $periods, (member, periods) => {
  if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member)) return null;
  return evidenceService.getPromotionPeriod(member, periods);
});

const $leftToPromotionPeriod = combine(
  { promotionPeriod: $promotionPeriod, currentBlock: block.$currentBlock, member: profile.$member },
  ({ promotionPeriod, currentBlock, member }) => {
    if (nullable(promotionPeriod) || nullable(member) || !memberService.isCoreMember(member)) return null;

    const gone = currentBlock - member.lastPromotion;
    return Math.max(0, promotionPeriod - gone);
  },
);

const $demotionPeriod = combine(profile.$member, $periods, (member, periods) => {
  if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member)) return null;
  return evidenceService.getDemotionPeriod(member, periods);
});

// tracks

const $tracks = fellowship.$store.map(store => store?.tracks ?? []);

const $nextTrack = combine(profile.$member, $tracks, (member, tracks) => {
  if (nullable(member)) return null;
  const index = tracks.findIndex(t => t.id === member.rank);

  return tracks.at(index + 1) ?? null;
});

const $track = combine(profile.$member, $tracks, (member, tracks) => {
  if (nullable(member)) return null;

  return tracks.find(t => t.id === member.rank) ?? null;
});

// requesting data

const evendenceRequested = fellowshipSalaryFeature.running.filterMap(({ api, palletType, chain, member }) => {
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
  $currentBlock: block.$currentBlock,
  $track,
  $nextTrack,
  $periods,
  $promotionPeriod,
  $leftToPromotionPeriod,
  $demotionPeriod,
  $memberEvidence,
  $hasRetentionEvidence,
  $hasPromotionEvidence,

  $showAttention,
  hideAttention,
};
