import { BN, BN_ONE, BN_ZERO } from '@polkadot/util';

import { type AccountVesting, type ComputedVestingSchedule, type VestingScheduleInfo } from './types';

export const vestingClaimService = {
  computeSchedule,
  computeAccountVesting,
  distributeClaimable,
  vestedAt,
  unlockBetween,
};

/**
 * How much of the schedule has vested by `block` — pallet_vesting's
 * `locked_at`, inverted.
 *
 * Mirrors the pallet: `per_block()` is clamped to at least 1 (schedules with a
 * stored `perBlock` of 0 exist on chain), the elapsed count saturates at zero
 * so blocks before `startingBlock` vest nothing, and the total is capped at
 * `locked` so blocks past the end vest nothing more.
 */
function vestedAt(schedule: VestingScheduleInfo, block: BN): BN {
  const perBlock = BN.max(schedule.perBlock, BN_ONE);
  const elapsed = BN.max(BN_ZERO, block.sub(schedule.startingBlock));

  return BN.min(schedule.locked, perBlock.mul(elapsed));
}

/**
 * How much the schedule releases between two blocks.
 *
 * This — not `perBlock × blocks` — is the only honest answer to "how much
 * unlocks over the next day", because it respects _both_ ends of the schedule:
 * a schedule that has not started releases nothing until it does, and one that
 * finishes within the window releases only what is left of it. `perBlock ×
 * blocksPerDay` happily reports a daily rate many times the schedule's entire
 * size for anything that runs for less than a day — a cliff, which pays out in
 * a single block, worst of all.
 */
function unlockBetween(schedule: VestingScheduleInfo, fromBlock: BN, toBlock: BN): BN {
  return BN.max(BN_ZERO, vestedAt(schedule, toBlock).sub(vestedAt(schedule, fromBlock)));
}

/** Derives the current figures for a single vesting schedule at `currentBlock`. */
function computeSchedule(schedule: VestingScheduleInfo, currentBlock: BN): ComputedVestingSchedule {
  const perBlock = BN.max(schedule.perBlock, BN_ONE);

  const vestedSoFar = vestedAt(schedule, currentBlock);
  const lockedNow = schedule.locked.sub(vestedSoFar);

  // ceil(locked / perBlock) blocks after the start the schedule is fully vested.
  const durationBlocks = schedule.locked.add(perBlock).sub(BN_ONE).div(perBlock);
  const endBlock = schedule.startingBlock.add(durationBlocks);

  return {
    ...schedule,
    lockedNow,
    vestedSoFar,
    endBlock,
    isCliff: perBlock.gte(schedule.locked),
    hasStarted: currentBlock.gte(schedule.startingBlock),
  };
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
  let endBlock = BN_ZERO;

  for (const schedule of computed) {
    total = total.add(schedule.locked);
    stillLocked = stillLocked.add(schedule.lockedNow);

    if (schedule.endBlock.gt(endBlock)) {
      endBlock = schedule.endBlock;
    }
  }

  const claimable = BN.max(BN_ZERO, lockAmount.sub(stillLocked));

  return { total, stillLocked, claimable, endBlock, schedules: computed };
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
