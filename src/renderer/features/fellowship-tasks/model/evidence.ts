import { attach, combine, sample } from 'effector';

import { createFlow, populated, series } from '@/shared/effector';
import { attachToFeatureInput } from '@/shared/feature';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type Evidence, evidence, referendumService, trackService } from '@/domains/collectives';

import { fellowshipTasksFeature } from './feature';
import { fellowship } from './fellowship';
import { memberProfile } from './memberProfile';
import { referendums } from './referendums';

// flow

const evidenceContentFlow = createFlow<{ evidence: Evidence | null }>({ evidence: null });

// evidences

const $members = fellowship.$store.map(s => s?.members ?? []);
const $evidences = fellowship.$store.map(s => s?.evidence ?? []);
const $evidencesContent = fellowship.$store.map(s => s?.evidenceContent ?? []);
const $evidencesSummary = fellowship.$store.map(s => s?.evidenceSummary ?? []);

const $memberEvidence = combine(memberProfile.$member, $evidences, (member, evidences) => {
  return member ? (evidences.find(e => e.accountId === member.accountId) ?? null) : null;
});

const $memberEvidenceSummary = combine($memberEvidence, $evidencesSummary, (evidence, summaries) => {
  return evidence ? (summaries.find(e => e.hash === evidence.hash) ?? null) : null;
});

const $hasRetentionEvidence = $memberEvidence.map(x => x?.wish === 'Retention');
const $hasPromotionEvidence = $memberEvidence.map(x => x?.wish === 'Promotion');

const requestEvidenceFx = attach({ effect: evidence.request });
const requestEvidenceContentFx = attach({ effect: evidence.requestContent });
const requestEvidenceSummaryFx = attach({ effect: evidence.requestSummary });

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

// requesting data

const evidenceContentRequested = attachToFeatureInput(fellowshipTasksFeature, evidenceContentFlow.open).filterMap(
  ({ input, data: { evidence } }) => {
    if (nullable(evidence)) return;

    return {
      api: input.api,
      chainId: input.chainId,
      palletType: input.palletType,
      accountId: evidence?.accountId,
    };
  },
);

sample({
  clock: evidenceContentRequested,
  target: requestEvidenceContentFx,
});

sample({
  clock: attachToFeatureInput(fellowshipTasksFeature, $members),
  fn: ({ input, data: members }) => ({
    api: input.api,
    palletType: input.palletType,
    chainId: input.chainId,
    accounts: members.map(m => m.accountId),
  }),
  target: requestEvidenceFx,
});

sample({
  clock: attachToFeatureInput(fellowshipTasksFeature, requestEvidenceFx.doneData),
  fn: ({ input, data: evidences }) => {
    return evidences.filter(nonNullable).map(e => ({
      palletType: input.palletType,
      chainId: input.chainId,
      accountId: e.accountId,
      evidence: e.hash,
    }));
  },
  target: series(requestEvidenceSummaryFx, { parallel: true, skipErrors: true }),
});

export const evidenceModel = {
  evidenceContentFlow,

  $evidences,
  $evidencesContent,
  $evidencesSummary,
  $evidencesWithoutReferendums,
  $memberEvidence,
  $memberEvidenceSummary,
  $hasRetentionEvidence,
  $hasPromotionEvidence,
  requestEvidence: requestEvidenceFx,
  requestEvidenceContent: requestEvidenceContentFx,
  requestEvidenceSummary: requestEvidenceSummaryFx,
  $summaryPopulated,
};
