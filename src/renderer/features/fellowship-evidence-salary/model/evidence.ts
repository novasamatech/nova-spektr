import { combine, sample } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { evidence, evidenceService, memberService } from '@/domains/collectives';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

import { fellowshipEvidenceSalaryFeature } from './feature';
import { fellowship } from './fellowship';
import { profile } from './profile';

// evidences

const $evidences = fellowship.$store.map(s => s?.evidence ?? []);

const $memberEvidence = combine(profile.$member, $evidences, (member, evidences) => {
  return member ? (evidences.find(e => e.accountId === member.accountId) ?? null) : null;
});

const $hasRetentionEvidence = $memberEvidence.map(x => x?.wish === 'Retention');

// periods

const $periods = fellowship.$store.map(store => store?.evidencePeriods ?? null);

const $leftToDemotion = combine(
  { periods: $periods, currentBlock: fellowshipNetwork.$currentBlock, member: profile.$member },
  ({ periods, currentBlock, member }) => {
    if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member) || nullable(currentBlock)) {
      return null;
    }
    return evidenceService.getBlocksUntilDemotion(member, periods, currentBlock);
  },
);

// requesting data

const evidenceRequested = fellowshipEvidenceSalaryFeature.running.filterMap(({ api, palletType, chainId, member }) => {
  if (nullable(member)) return;

  return {
    api,
    palletType,
    chainId,
    accounts: [member.accountId],
  };
});

sample({
  clock: evidenceRequested,
  target: evidence.request,
});

const evidencePeriodsRequested = fellowshipEvidenceSalaryFeature.running.filterMap(({ palletType, chain }) => {
  return {
    palletType,
    chainId: chain.chainId,
  };
});

sample({
  clock: evidencePeriodsRequested,
  target: evidence.requestPeriods,
});

export const evidenceInfo = {
  $leftToDemotion,
  $hasRetentionEvidence,
};
