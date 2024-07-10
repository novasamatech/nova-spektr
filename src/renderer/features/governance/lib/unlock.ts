import { Address } from '@shared/core';
import { Chunks, UnlockChunk } from '@shared/api/governance';

export const unlockService = {
  getSecondsDuratonToBlock,
  filterClaims,
};

function getSecondsDuratonToBlock(timeToBlock: number): number {
  const currentTime = new Date().getTime();
  const time = timeToBlock - currentTime;

  return Math.floor(time / 1000);
}

function filterClaims(claimSchedule: Chunks[], address: Address): UnlockChunk[] {
  const result = [];
  for (const claim of claimSchedule) {
    if (claim.amount?.isZero()) continue;
    result.push({ ...claim, address });
  }

  return result;
}
