import { BN, BN_ZERO } from '@polkadot/util';

import { type Balance, type EraIndex, type Unlocking } from '@/shared/core';
import { ZERO_BALANCE, redeemableAmount, votedAmountBN } from '@/shared/lib/utils';

function reusableLockBN(balance: Balance): BN {
  const voted = votedAmountBN(balance);
  const reusable = voted.sub(balance.reserved);

  return BN.max(BN_ZERO, reusable);
}

function getNextUnstakingEra(unlocking: Unlocking[] = [], era?: number): EraIndex | undefined {
  if (!era) return undefined;
  const unlockingMatch = unlocking.find(u => Number(u.era) > era);

  return unlockingMatch ? Number(unlockingMatch.era) : undefined;
}

function hasRedeem(unlocking: Unlocking[] = [], era?: number): boolean {
  if (!era || unlocking.length === 0) return false;

  return redeemableAmount(unlocking, era) !== ZERO_BALANCE;
}

export const stakingUtils = {
  reusableLockBN,
  getNextUnstakingEra,
  hasRedeem,
};
