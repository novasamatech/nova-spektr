import { BN } from '@polkadot/util';
import { describe, expect, it } from 'vitest';

import { type VestingScheduleInfo } from './types';
import { vestingClaimService } from './vestingClaimService';

const schedule = (locked: number, perBlock: number, startingBlock: number): VestingScheduleInfo => ({
  locked: new BN(locked),
  perBlock: new BN(perBlock),
  startingBlock: new BN(startingBlock),
});

describe('vestingClaimService.computeSchedule', () => {
  it('keeps everything locked before the start block', () => {
    const result = vestingClaimService.computeSchedule(schedule(1000, 10, 100), new BN(50));

    expect(result.vestedSoFar.toString()).toBe('0');
    expect(result.lockedNow.toString()).toBe('1000');
    // ceil(1000 / 10) = 100 blocks -> ends at 200
    expect(result.endBlock.toString()).toBe('200');
  });

  it('calls a single-block release a cliff, and a gradual schedule not one — however far off its start is', () => {
    // The pair pallet_vesting stores for a cliffed vested transfer: the cliff
    // amount, which unlocks whole at the start block, and the rest, which
    // vests from that same block onwards.
    const cliff = vestingClaimService.computeSchedule(schedule(50_000_000, 50_000_000, 34_364_257), new BN(34_000_000));
    const gradual = vestingClaimService.computeSchedule(
      schedule(49_950_000_000, 50_000_000, 34_364_257),
      new BN(34_000_000),
    );

    expect(cliff.isCliff).toBe(true);
    expect(gradual.isCliff).toBe(false);

    // Neither has started — which on its own says nothing about being a cliff.
    expect(cliff.hasStarted).toBe(false);
    expect(gradual.hasStarted).toBe(false);
    expect(cliff.vestedSoFar.isZero()).toBe(true);
    expect(gradual.vestedSoFar.isZero()).toBe(true);

    // The cliff is done one block after it starts; the gradual one runs 999 blocks.
    expect(cliff.endBlock.toString()).toBe('34364258');
    expect(gradual.endBlock.toString()).toBe('34365256');
  });

  it('marks a schedule started once the chain reaches its start block', () => {
    const before = vestingClaimService.computeSchedule(schedule(1000, 10, 100), new BN(99));
    const at = vestingClaimService.computeSchedule(schedule(1000, 10, 100), new BN(100));

    expect(before.hasStarted).toBe(false);
    expect(at.hasStarted).toBe(true);
  });

  it('treats a schedule that over-releases (perBlock > locked) as a cliff', () => {
    const result = vestingClaimService.computeSchedule(schedule(500, 1000, 100), new BN(50));

    expect(result.isCliff).toBe(true);
    expect(result.endBlock.toString()).toBe('101');
  });

  it('linearly vests part-way through', () => {
    // 30 blocks elapsed * 10 per block = 300 vested
    const result = vestingClaimService.computeSchedule(schedule(1000, 10, 100), new BN(130));

    expect(result.vestedSoFar.toString()).toBe('300');
    expect(result.lockedNow.toString()).toBe('700');
  });

  it('clamps to fully vested past the end block', () => {
    const result = vestingClaimService.computeSchedule(schedule(1000, 10, 100), new BN(100_000));

    expect(result.vestedSoFar.toString()).toBe('1000');
    expect(result.lockedNow.toString()).toBe('0');
  });

  it('treats perBlock of 0 as 1 (pallet clamp) and never divides by zero', () => {
    const result = vestingClaimService.computeSchedule(schedule(1000, 0, 0), new BN(400));

    expect(result.vestedSoFar.toString()).toBe('400');
    expect(result.lockedNow.toString()).toBe('600');
    // ceil(1000 / 1) = 1000 blocks -> ends at 1000
    expect(result.endBlock.toString()).toBe('1000');
  });
});

describe('vestingClaimService.unlockBetween', () => {
  const BLOCKS_PER_DAY = new BN(14_400); // Kusama relay, 6s blocks

  it('is the plain rate while the schedule runs across the whole window', () => {
    // 100 000 blocks of runway at 10/block — a day makes no dent in it.
    const result = vestingClaimService.unlockBetween(
      schedule(1_000_000, 10, 0),
      new BN(100),
      new BN(100).add(BLOCKS_PER_DAY),
    );

    expect(result.toString()).toBe((10 * 14_400).toString());
  });

  it('releases nothing while the start block is more than a window away', () => {
    const result = vestingClaimService.unlockBetween(
      schedule(1_000_000, 10, 50_000),
      new BN(100),
      new BN(100).add(BLOCKS_PER_DAY),
    );

    expect(result.toString()).toBe('0');
  });

  it('counts only the part of the window that falls after the start block', () => {
    // Starts 400 blocks out; 14 000 of the day's 14 400 blocks vest, at 10 each.
    const result = vestingClaimService.unlockBetween(
      schedule(1_000_000, 10, 500),
      new BN(100),
      new BN(100).add(BLOCKS_PER_DAY),
    );

    expect(result.toString()).toBe((10 * 14_000).toString());
  });

  it('never releases more than the schedule holds — the bug that showed 4.32 KSM of a 0.05 KSM vesting', () => {
    // The user's real pair, a block before they start. `perBlock × blocksPerDay`
    // would claim 50 000 000 × 14 400 = 720 000 000 000 planks *each*, ~29x the
    // 50 000 000 000 planks the whole vesting is worth. Both finish inside the day.
    const from = new BN(34_364_256);
    const to = from.add(BLOCKS_PER_DAY);

    const cliff = vestingClaimService.unlockBetween(schedule(50_000_000, 50_000_000, 34_364_257), from, to);
    const gradual = vestingClaimService.unlockBetween(schedule(49_950_000_000, 50_000_000, 34_364_257), from, to);

    expect(cliff.toString()).toBe('50000000');
    expect(gradual.toString()).toBe('49950000000');
    // Everything the account holds unlocks within the day, and not a plank more.
    expect(cliff.add(gradual).toString()).toBe('50000000000');
  });

  it('releases only what is left of a schedule already under way', () => {
    // 1000 locked, 10/block, started at 0: by block 950 only 500 is left, and
    // that is all the next day can release however long the window is.
    const result = vestingClaimService.unlockBetween(schedule(1000, 10, 0), new BN(50), new BN(50).add(BLOCKS_PER_DAY));

    expect(result.toString()).toBe('500');
  });

  it('releases nothing from a schedule that has already finished', () => {
    const result = vestingClaimService.unlockBetween(
      schedule(1000, 10, 0),
      new BN(5000),
      new BN(5000).add(BLOCKS_PER_DAY),
    );

    expect(result.toString()).toBe('0');
  });
});

describe('vestingClaimService.computeAccountVesting', () => {
  it('aggregates multiple schedules with different start blocks', () => {
    const schedules = [schedule(1000, 10, 100), schedule(500, 5, 0)];
    // block 130: s1 vested 300 (locked 700), s2 vested min(500, 5*130=650)=500 (locked 0)
    const lock = new BN(700); // on-chain lock equals still-locked -> nothing extra to claim
    const result = vestingClaimService.computeAccountVesting(schedules, new BN(130), lock);

    expect(result.total.toString()).toBe('1500');
    expect(result.stillLocked.toString()).toBe('700');
    expect(result.claimable.toString()).toBe('0');
    // latest end block: s1 ends at 200, s2 at 100
    expect(result.endBlock.toString()).toBe('200');
  });

  it('reports claimable as lock minus still-locked (stale lock after no prior claim)', () => {
    const schedules = [schedule(1000, 10, 100)];
    // block 130 -> still locked 700; lock never updated so it still equals 1000
    const result = vestingClaimService.computeAccountVesting(schedules, new BN(130), new BN(1000));

    expect(result.claimable.toString()).toBe('300');
  });

  it('reports claimable of 0 after a partial claim already synced the lock', () => {
    const schedules = [schedule(1000, 10, 100)];
    // block 130 -> still locked 700; lock already lowered to 700 by a prior vest()
    const result = vestingClaimService.computeAccountVesting(schedules, new BN(130), new BN(700));

    expect(result.claimable.toString()).toBe('0');
  });

  it('never returns a negative claimable', () => {
    const schedules = [schedule(1000, 10, 100)];
    const result = vestingClaimService.computeAccountVesting(schedules, new BN(130), new BN(0));

    expect(result.claimable.toString()).toBe('0');
  });
});

describe('vestingClaimService.distributeClaimable', () => {
  const computeAll = (schedules: VestingScheduleInfo[], currentBlock: BN) =>
    schedules.map(s => vestingClaimService.computeSchedule(s, currentBlock));

  it('attributes everything to the only vested schedule', () => {
    // block 130: s1 vested 300, s2 still in cliff (vested 0)
    const computed = computeAll([schedule(1000, 10, 100), schedule(500, 5, 200)], new BN(130));

    const shares = vestingClaimService.distributeClaimable(computed, new BN(300));

    expect(shares.map(s => s.toString())).toEqual(['300', '0']);
  });

  it('splits proportionally to the vested amounts', () => {
    // block 130: s1 vested 300, s2 vested 150 -> 2:1 split
    const computed = computeAll([schedule(1000, 10, 100), schedule(500, 5, 100)], new BN(130));

    const shares = vestingClaimService.distributeClaimable(computed, new BN(450));

    expect(shares.map(s => s.toString())).toEqual(['300', '150']);
  });

  it('gives flooring dust to the most-vested schedule so shares sum to claimable', () => {
    // block 130: s1 vested 300, s2 vested 150; claimable 100 -> floor(66.6)=66 + floor(33.3)=33 + 1 dust
    const computed = computeAll([schedule(1000, 10, 100), schedule(500, 5, 100)], new BN(130));

    const shares = vestingClaimService.distributeClaimable(computed, new BN(100));

    expect(shares.map(s => s.toString())).toEqual(['67', '33']);
  });

  it('returns zero shares when nothing has vested yet (cliff)', () => {
    const computed = computeAll([schedule(1000, 10, 100)], new BN(50));

    const shares = vestingClaimService.distributeClaimable(computed, new BN(1000));

    expect(shares.map(s => s.toString())).toEqual(['0']);
  });

  it('returns zero shares when there is nothing to claim', () => {
    const computed = computeAll([schedule(1000, 10, 100)], new BN(130));

    const shares = vestingClaimService.distributeClaimable(computed, new BN(0));

    expect(shares.map(s => s.toString())).toEqual(['0']);
  });
});
