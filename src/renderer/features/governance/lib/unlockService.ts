import { type Chunks, type UnlockChunk } from '@/shared/api/governance';
import { type Address } from '@/shared/core';

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
