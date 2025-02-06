import { combine, sample } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { evidence, evidenceService, memberService } from '@/domains/collectives';

import { block } from './block';
import { fellowshipSalaryFeature } from './feature';
import { fellowship } from './fellowship';
import { member } from './member';

const $tracks = fellowship.$store.map(store => store?.tracks ?? []);
const $periods = fellowship.$store.map(store => store?.evidencePeriods ?? null);

const $fellowshipEvidences = evidence.$list.map(s => s['fellowship'] ?? {});
const $chainEvidences = combine(fellowshipSalaryFeature.input, $fellowshipEvidences, (input, evidences) => {
  if (nullable(input)) return [];
  return evidences[input.chainId] ?? [];
});

const $track = combine(member.$member, $tracks, (member, tracks) => {
  if (nullable(member)) return null;

  return tracks.find(t => t.id === member.rank) ?? null;
});

const $memberEvidence = combine(member.$member, $chainEvidences, (member, evidences) => {
  return member ? (evidences.find(e => e.accountId === member.accountId) ?? null) : null;
});

const $hasRetentionEvidence = $memberEvidence.map(x => x?.wish === 'Retention');

const $currentPeriod = combine(
  { member: member.$member, periods: $periods, currentBlock: block.$currentBlock },
  ({ member, periods, currentBlock }) => {
    if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member)) return null;
    return evidenceService.getCurrentMembersPeriod(member, periods, currentBlock);
  },
);

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
  $track,
  $periods,
  $currentPeriod,
  $memberEvidence,
  $hasRetentionEvidence,
};
