import { type Chunks, type UnlockChunk } from '@/shared/api/governance';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const unlockService = {
  filterClaims,
};

function filterClaims(claimSchedule: Chunks[], accountId: AccountId): UnlockChunk[] {
  const result: UnlockChunk[] = [];

  for (const claim of claimSchedule) {
    if (claim.amount?.isZero()) continue;

    result.push({ ...claim, accountId });
  }

  return result;
}
