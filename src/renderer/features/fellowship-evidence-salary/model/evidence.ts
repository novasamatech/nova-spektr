import { combine, sample } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { evidence, evidenceService, memberService } from '@/domains/collectives';

import { block } from './block';
import { fellowshipSalaryFeature } from './feature';
import { fellowship } from './fellowship';
import { profile } from './profile';

const $tracks = fellowship.$store.map(store => store?.tracks ?? []);
const $periods = fellowship.$store.map(store => store?.evidencePeriods ?? null);

const $fellowshipEvidences = evidence.$list.map(s => s['fellowship'] ?? {});
const $chainEvidences = combine(fellowshipSalaryFeature.input, $fellowshipEvidences, (input, evidences) => {
  if (nullable(input)) return [];
  return evidences[input.chainId] ?? [];
});

const $track = combine(profile.$member, $tracks, (member, tracks) => {
  if (nullable(member)) return null;

  return tracks.find(t => t.id === member.rank) ?? null;
});

const $nextTrack = combine(profile.$member, $tracks, (member, tracks) => {
  if (nullable(member)) return null;
  const index = tracks.findIndex(t => t.id === member.rank);

  return tracks.at(index + 1) ?? null;
});

const $memberEvidence = combine(profile.$member, $chainEvidences, (member, evidences) => {
  return member ? (evidences.find(e => e.accountId === member.accountId) ?? null) : null;
});

const $hasRetentionEvidence = $memberEvidence.map(x => x?.wish === 'Retention');
const $hasPromotionEvidence = $memberEvidence.map(x => x?.wish === 'Promotion');

const $promotionPeriod = combine(profile.$member, $periods, (member, periods) => {
  if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member)) return null;
  return evidenceService.getPromotionPeriod(member, periods);
});

const $demotionPeriod = combine(profile.$member, $periods, (member, periods) => {
  if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member)) return null;
  return evidenceService.getDemotionPeriod(member, periods);
});

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

export const retentionEvidence = {
  $currentBlock: block.$currentBlock,
  $track,
  $nextTrack,
  $periods,
  $promotionPeriod,
  $demotionPeriod,
  $memberEvidence,
  $hasRetentionEvidence,
  $hasPromotionEvidence,
};
