import { combine, createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

import { nullable } from '@/shared/lib/utils';
import { evidenceService, memberService } from '@/domains/collectives';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

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

const $leftToPromotion = combine(
  { periods: $periods, currentBlock: fellowshipNetwork.$currentBlock, member: profile.$member },
  ({ periods, currentBlock, member }) => {
    if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member) || nullable(currentBlock))
      return null;
    return evidenceService.getBlockUntilNextPromotion(member, periods, currentBlock);
  },
);

const $demotionPeriod = combine(profile.$member, $periods, (member, periods) => {
  if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member)) return null;
  return evidenceService.getDemotionPeriod(member, periods);
});

const $leftToDemotion = combine(
  { periods: $periods, currentBlock: fellowshipNetwork.$currentBlock, member: profile.$member },
  ({ periods, currentBlock, member }) => {
    if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member) || nullable(currentBlock))
      return null;
    return evidenceService.getBlocksUntilDemotion(member, periods, currentBlock);
  },
);

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
  $currentBlock: fellowshipNetwork.$currentBlock,
  $track,
  $nextTrack,
  $periods,
  $leftToPromotion,
  $demotionPeriod,
  $leftToDemotion,
  $memberEvidence,
  $hasRetentionEvidence,
  $hasPromotionEvidence,

  $showAttention,
  hideAttention,
};
