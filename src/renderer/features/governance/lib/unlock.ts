import { Address } from '@shared/core';
import { Chunks, UnlockChunk } from '@shared/api/governance';

export const unlockService = {
  filterClaims,
};

function filterClaims(claimSchedule: Chunks[], address: Address): UnlockChunk[] {
  const result = [];
  for (const claim of claimSchedule) {
    if (claim.amount?.isZero()) continue;
    result.push({ ...claim, address });
  }

  return result;
}