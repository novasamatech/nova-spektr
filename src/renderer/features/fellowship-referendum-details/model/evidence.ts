import { attach, sample } from 'effector';
import { createGate } from 'effector-react';

import { attachToFeatureInput } from '@/shared/feature';
import { type Evidence, evidence } from '@/domains/collectives';

import { fellowshipReferendumsDetailsFeature } from './feature';
import { fellowship } from './fellowship';

// flow

const evidenceContentFlow = createGate<{ evidence: Evidence | null }>({ defaultState: { evidence: null } });

// evidences
const $evidencesContent = fellowship.$store.map(s => s?.evidenceContent ?? []);

const requestEvidenceContentFx = attach({ effect: evidence.requestContent });

// requesting data

const evidenceContentRequested = attachToFeatureInput(
  fellowshipReferendumsDetailsFeature,
  evidenceContentFlow.open,
).filterMap(({ input, data: { evidence } }) => {
  if (evidence) {
    return {
      api: input.api,
      chainId: input.chainId,
      palletType: input.palletType,
      accountId: evidence?.accountId,
    };
  }
});

sample({
  clock: evidenceContentRequested,
  target: requestEvidenceContentFx,
});

export const evidenceModel = {
  evidenceContentFlow,

  $evidencesContent,
  requestEvidenceContent: requestEvidenceContentFx,
};
