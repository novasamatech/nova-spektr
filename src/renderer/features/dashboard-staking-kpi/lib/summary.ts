import { default as BigNumber } from 'bignumber.js';

import { type StakingPosition } from '@/domains/staking';

/**
 * The aggregate is scoped to the dashboard selection; the KPI row additionally
 * follows the dashboard's own account picker, so positions of accounts the user
 * unticked must not show up in the totals.
 *
 * The totals themselves are the aggregate's own `summarizePositions` run over
 * the narrowed list — the per-chain rules (planck never summed across assets,
 * active validators counted per chain) have exactly one implementation.
 */
export function filterPositionsByAccounts(positions: StakingPosition[], accountIds: string[]): StakingPosition[] {
  const allowed = new Set(accountIds);

  return positions.filter((position) => allowed.has(position.accountId));
}

/** Positions that hold something withdrawable right now. */
export function withdrawablePositions(positions: StakingPosition[]): StakingPosition[] {
  return positions.filter((position) => new BigNumber(position.redeemable).gt(0));
}
