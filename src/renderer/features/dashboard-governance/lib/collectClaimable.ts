import { type BN, BN_ZERO } from '@polkadot/util';

import { type Chunks, type ClaimAction, UnlockChunkType } from '@/shared/api/governance';

/**
 * Folds a claim schedule into what is releasable right now: the summed amount
 * and the calls that release it. Zero-amount claimable chunks carry no money
 * and are skipped along with their calls.
 */
export function collectClaimable(schedule: Chunks[]): { actions: ClaimAction[]; amount: BN } {
  let amount = BN_ZERO;
  const actions: ClaimAction[] = [];

  for (const chunk of schedule) {
    if (chunk.type === UnlockChunkType.CLAIMABLE && !chunk.amount.isZero()) {
      amount = amount.add(chunk.amount);
      actions.push(...chunk.actions);
    }
  }

  return { actions, amount };
}
