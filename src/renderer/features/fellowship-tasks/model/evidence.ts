import { attach, combine } from 'effector';

import { populated } from '@/shared/effector';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { evidence, referendumService, trackService } from '@/domains/collectives';

import { fellowship } from './fellowship';
import { memberProfile } from './memberProfile';
import { referendums } from './referendums';

// evidences

const $evidences = fellowship.$store.map(s => s?.evidence ?? []);
const $evidencesSummary = fellowship.$store.map(s => s?.evidenceSummary ?? []);

const $memberEvidence = combine(memberProfile.$member, $evidences, (member, evidences) => {
  return member ? (evidences.find(e => e.accountId === member.accountId) ?? null) : null;
});

const $memberEvidenceSummary = combine($memberEvidence, $evidencesSummary, (evidence, summaries) => {
  return evidence ? (summaries.find(e => e.hash === evidence.hash) ?? null) : null;
});

const $hasRetentionEvidence = $memberEvidence.map(x => x?.wish === 'Retention');
const $hasPromotionEvidence = $memberEvidence.map(x => x?.wish === 'Promotion');

const requestEvidenceSummaryFx = attach({ effect: evidence.evidenceSummaryResource.fetch });

const $summaryPopulated = populated(requestEvidenceSummaryFx);

// filtered evidences

const $evidencesWithoutReferendums = combine(
  { evidences: $evidences, referendums: referendums.$ongoing },
  ({ evidences, referendums }) => {
    const proposers = referendums
      .map(r => {
        return trackService.isPromotionTrack(r.track) || trackService.isRetentionTrack(r.track)
          ? referendumService.getProposer(r)
          : null;
      })
      .filter(nonNullable);

    return evidences.filter(evidence => {
      return nullable(proposers.find(p => p === evidence.accountId));
    });
  },
);

export const evidenceModel = {
  $evidences,
  $evidencesSummary,
  $evidencesWithoutReferendums,
  $memberEvidence,
  $memberEvidenceSummary,
  $hasRetentionEvidence,
  $hasPromotionEvidence,
  requestEvidenceSummary: requestEvidenceSummaryFx,
  $summaryPopulated,
};
