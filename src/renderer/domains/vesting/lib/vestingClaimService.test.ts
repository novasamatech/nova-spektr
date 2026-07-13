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
  it('keeps everything locked before the start block (cliff)', () => {
    const result = vestingClaimService.computeSchedule(schedule(1000, 10, 100), new BN(50));

    expect(result.vestedSoFar.toString()).toBe('0');
    expect(result.lockedNow.toString()).toBe('1000');
    // ceil(1000 / 10) = 100 blocks -> ends at 200
    expect(result.endBlock.toString()).toBe('200');
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

describe('vestingClaimService.computeAccountVesting', () => {
  it('aggregates multiple schedules with different start blocks', () => {
    const schedules = [schedule(1000, 10, 100), schedule(500, 5, 0)];
    // block 130: s1 vested 300 (locked 700), s2 vested min(500, 5*130=650)=500 (locked 0)
    const lock = new BN(700); // on-chain lock equals still-locked -> nothing extra to claim
    const result = vestingClaimService.computeAccountVesting(schedules, new BN(130), lock);

    expect(result.total.toString()).toBe('1500');
    expect(result.stillLocked.toString()).toBe('700');
    expect(result.claimable.toString()).toBe('0');
    // only the still-vesting schedule (s1) contributes to the rate
    expect(result.perBlockRate.toString()).toBe('10');
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
