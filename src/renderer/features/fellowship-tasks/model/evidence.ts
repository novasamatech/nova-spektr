import { attach, combine, sample } from 'effector';

import { populated } from '@/shared/effector';
import { evidence } from '@/domains/collectives';

import { fellowshipTasksFeature } from './feature';
import { fellowship } from './fellowship';
import { memberProfile } from './memberProfile';

// evidences

const requestEvidenceFx = attach({ effect: evidence.request });

const $evidences = fellowship.$store.map(s => s?.evidence ?? []);
const $evidencePopulated = populated(requestEvidenceFx);

const $memberEvidence = combine(memberProfile.$member, $evidences, (member, evidences) => {
  return member ? (evidences.find(e => e.accountId === member.accountId) ?? null) : null;
});

const $hasRetentionEvidence = $memberEvidence.map(x => x?.wish === 'Retention');
const $hasPromotionEvidence = $memberEvidence.map(x => x?.wish === 'Promotion');

// requesting data

const evendenceRequested = fellowshipTasksFeature.running.filterMap(({ api, palletType, chain, member }) => {
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
  target: requestEvidenceFx,
});

export const evidenceInfo = {
  $evidences,
  $evidencePopulated,
  $memberEvidence,
  $hasRetentionEvidence,
  $hasPromotionEvidence,
  pending: requestEvidenceFx.pending,
};
