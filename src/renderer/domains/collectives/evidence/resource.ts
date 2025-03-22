import { z } from 'zod';

import { type ChainId, type HexString } from '@/shared/core';

import { evidenceService } from './service';

export function fetchEvidenceFromSubsquare(evidence: HexString) {
  return fetch(evidenceService.getEvidenceIpfsUrl(evidence)).then(r => r.text());
}

export function fetchEvidenceSummary(
  evidence: HexString,
  chainId: ChainId,
  languageIsoCode: string,
  githubHandle?: string,
  evidencePeriodStart?: string,
) {
  const schema = z.object({
    summary: z.string(),
    numberOfPullRequests: z.number().nullable(),
    numberOfMergedPullRequests: z.number().nullable(),
  });

  const evidenceId = evidenceService.getCidByEvidence(evidence);
  const url = new URL('/api/v1/evidence-summaries/single', 'https://opengov-backend-dev.novasama-tech.org');

  const request = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    mode: 'cors',
    body: JSON.stringify({
      chainId: chainId.replace(/^0x/, 'x'),
      evidenceId,
      languageIsoCode,
      githubHandle,
      evidencePeriodStart,
    }),
  });

  return request.then(r => r.json()).then(schema.parse);
}
