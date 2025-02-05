import { type HexString } from '@/shared/core';

import { evidenceService } from './service';

export function fetchEvidenceFromSubsquare(evidence: HexString) {
  return fetch(evidenceService.getEvidenceIpfsUrl(evidence)).then(r => r.text());
}
