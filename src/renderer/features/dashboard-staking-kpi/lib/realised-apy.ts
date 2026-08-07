import { default as BigNumber } from 'bignumber.js';

const DAYS_PER_YEAR = 365;

/**
 * What a position actually earned over a window, annualised.
 *
 * Simple, non-compounding annualisation — `rewards / staked × 365 / days` — the
 * formula the figure is expected to match, and the one a spreadsheet reproduces
 * without knowing anything about compounding conventions.
 *
 * **The denominator is the stake as it is now**, not a time-weighted average
 * over the window: the ledger only reports today's bond, and reconstructing
 * yesterday's would cost an `erasStakers` read per era in the range. The number
 * is therefore right for a position that was bonded throughout and overstates —
 * or understates — one that changed size mid-window, which is why the column
 * says "realised" and carries the assumption in its tooltip rather than being
 * printed next to the forward-looking network APY as if they were the same kind
 * of number.
 *
 * `null` when there is nothing to divide by, or no window to annualise over: a
 * yield over an unstaked position is not zero, it does not exist.
 */
export function realisedApy(rewardsPlanck: string, stakedPlanck: string, days: number | null): number | null {
  if (days === null || days <= 0) return null;

  const staked = new BigNumber(stakedPlanck);
  if (!staked.isFinite() || staked.lte(0)) return null;

  const rewards = new BigNumber(rewardsPlanck);
  if (!rewards.isFinite()) return null;

  return rewards.div(staked).multipliedBy(DAYS_PER_YEAR).div(days).multipliedBy(100).toNumber();
}
