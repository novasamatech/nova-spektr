import { BN, BN_ONE, BN_ZERO } from '@polkadot/util';

import { type AccountVesting, type ComputedVestingSchedule, type VestingScheduleInfo } from './types';

export const vestingClaimService = {
  computeSchedule,
  computeAccountVesting,
  distributeClaimable,
};

/**
 * Derives the current figures for a single vesting schedule at `currentBlock`.
 *
 * Mirrors pallet_vesting: `per_block()` is clamped to at least 1 (schedules
 * with a stored `perBlock` of 0 exist on chain), and `locked_at(now)` uses a
 * saturating subtraction so blocks before `startingBlock` keep the full amount
 * locked.
 */
function computeSchedule(schedule: VestingScheduleInfo, currentBlock: BN): ComputedVestingSchedule {
  const perBlock = BN.max(schedule.perBlock, BN_ONE);
  const elapsed = BN.max(BN_ZERO, currentBlock.sub(schedule.startingBlock));

  const vestedSoFar = BN.min(schedule.locked, perBlock.mul(elapsed));
  const lockedNow = schedule.locked.sub(vestedSoFar);

  // ceil(locked / perBlock) blocks after the start the schedule is fully vested.
  const durationBlocks = schedule.locked.add(perBlock).sub(BN_ONE).div(perBlock);
  const endBlock = schedule.startingBlock.add(durationBlocks);

  return { ...schedule, lockedNow, vestedSoFar, endBlock };
}

/**
 * Aggregates an account's vesting schedules on a single chain.
 *
 * `claimable` is what `vesting.vest()` would release: the difference between
 * the current on-chain vesting lock (`lockAmount`, from the account's balance
 * locks) and the amount still locked once every schedule is re-evaluated at
 * `currentBlock`. Deriving it from the lock (rather than summing vested
 * amounts) keeps it correct after prior partial claims.
 */
function computeAccountVesting(schedules: VestingScheduleInfo[], currentBlock: BN, lockAmount: BN): AccountVesting {
  const computed = schedules.map(schedule => computeSchedule(schedule, currentBlock));

  let total = BN_ZERO;
  let stillLocked = BN_ZERO;
  let perBlockRate = BN_ZERO;
  let endBlock = BN_ZERO;

  for (const schedule of computed) {
    total = total.add(schedule.locked);
    stillLocked = stillLocked.add(schedule.lockedNow);

    // Only schedules that are still vesting contribute to the unlock rate.
    if (!schedule.lockedNow.isZero()) {
      perBlockRate = perBlockRate.add(BN.max(schedule.perBlock, BN_ONE));
    }

    if (schedule.endBlock.gt(endBlock)) {
      endBlock = schedule.endBlock;
    }
  }

  const claimable = BN.max(BN_ZERO, lockAmount.sub(stillLocked));

  return { total, stillLocked, claimable, perBlockRate, endBlock, schedules: computed };
}

/**
 * Splits the account-level `claimable` across schedules, proportionally to how
 * much each schedule has vested so far.
 *
 * Pallet_vesting keeps a single lock per account (`vesting.vest()` releases
 * everything at once), so a per-schedule "ready now" figure is a display-level
 * attribution, not on-chain state. Flooring dust goes to the most-vested
 * schedule so the shares always sum exactly to `claimable`.
 */
function distributeClaimable(schedules: ComputedVestingSchedule[], claimable: BN): BN[] {
  let totalVested = BN_ZERO;
  for (const schedule of schedules) {
    totalVested = totalVested.add(schedule.vestedSoFar);
  }

  if (totalVested.isZero() || claimable.isZero()) {
    return schedules.map(() => BN_ZERO);
  }

  let distributed = BN_ZERO;
  let mostVestedIndex = 0;
  const shares = schedules.map((schedule, index) => {
    if (schedule.vestedSoFar.gt(schedules[mostVestedIndex]!.vestedSoFar)) {
      mostVestedIndex = index;
    }
    const share = claimable.mul(schedule.vestedSoFar).div(totalVested);
    distributed = distributed.add(share);

    return share;
  });

  const remainder = claimable.sub(distributed);
  if (!remainder.isZero()) {
    shares[mostVestedIndex] = shares[mostVestedIndex]!.add(remainder);
  }

  return shares;
}
