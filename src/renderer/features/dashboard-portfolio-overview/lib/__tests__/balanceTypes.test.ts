import { BN } from '@polkadot/util';

import { type Balance, LockTypes } from '@/shared/core';
import { splitBalanceByType } from '../balanceTypes';

type AssetLock = Balance['locked'][number];

const GOVERNANCE_LOCK = LockTypes.CONVICTION_VOTE;

const makeLock = (type: LockTypes, amount: number): AssetLock => ({ type, amount: new BN(amount) });

const makeBalance = (params: {
  free: number;
  reserved?: number;
  frozen: number;
  locks?: AssetLock[];
  mode?: 'legacy' | 'holdAndFreezes';
}): Balance => {
  // structural balance fixture, matching the fields splitBalanceByType reads
  const balance = {
    free: new BN(params.free),
    reserved: new BN(params.reserved ?? 0),
    frozen: new BN(params.frozen),
    locked: params.locks ?? [],
    transferableMode: params.mode ?? 'legacy',
  };

  return balance as unknown as Balance;
};

describe('splitBalanceByType', () => {
  test('attributes the whole vesting lock to vested when it is the only lock', () => {
    const balance = makeBalance({ free: 1000, frozen: 600, locks: [makeLock(LockTypes.VESTING, 600)] });

    const split = splitBalanceByType(balance);

    expect(split.transferable.toNumber()).toEqual(400);
    expect(split.vested.toNumber()).toEqual(600);
    expect(split.locked.toNumber()).toEqual(0);
  });

  test('shows the vesting lock even when a bigger lock covers it (vesting takes priority)', () => {
    // locks are a max, not a sum: frozen = max(600, 400) = 600; the vesting lock
    // must stay visible instead of hiding behind the governance lock
    const balance = makeBalance({
      free: 1000,
      frozen: 600,
      locks: [makeLock(GOVERNANCE_LOCK, 600), makeLock(LockTypes.VESTING, 400)],
    });

    const split = splitBalanceByType(balance);

    expect(split.vested.toNumber()).toEqual(400);
    expect(split.locked.toNumber()).toEqual(200);
  });

  test('attributes the whole vesting lock to vested when it overlaps a smaller lock', () => {
    const balance = makeBalance({
      free: 1000,
      frozen: 600,
      locks: [makeLock(LockTypes.VESTING, 600), makeLock(GOVERNANCE_LOCK, 400)],
    });

    const split = splitBalanceByType(balance);

    expect(split.vested.toNumber()).toEqual(600);
    expect(split.locked.toNumber()).toEqual(0);
  });

  test('caps vested by the total locked amount', () => {
    // vesting lock reported above what is actually frozen
    const balance = makeBalance({ free: 1000, frozen: 500, locks: [makeLock(LockTypes.VESTING, 800)] });

    const split = splitBalanceByType(balance);

    expect(split.vested.toNumber()).toEqual(500);
    expect(split.locked.toNumber()).toEqual(0);
  });

  test('keeps everything in locked when there is no vesting lock', () => {
    const balance = makeBalance({ free: 1000, frozen: 300, locks: [makeLock(GOVERNANCE_LOCK, 300)] });

    const split = splitBalanceByType(balance);

    expect(split.vested.toNumber()).toEqual(0);
    expect(split.locked.toNumber()).toEqual(300);
  });

  test('carves vested out of reserved when frozen is fully covered by reserved (holdAndFreezes)', () => {
    // holdAndFreezes: transferable = free − max(0, frozen − reserved) — a vesting
    // lock covered by a big reserve leaves the locked bucket empty
    const balance = makeBalance({
      free: 1000,
      reserved: 500,
      frozen: 300,
      locks: [makeLock(LockTypes.VESTING, 300)],
      mode: 'holdAndFreezes',
    });

    const split = splitBalanceByType(balance);

    expect(split.transferable.toNumber()).toEqual(1000);
    expect(split.vested.toNumber()).toEqual(300);
    expect(split.reserved.toNumber()).toEqual(200);
    expect(split.locked.toNumber()).toEqual(0);
  });

  test('splits vested between locked and reserved when frozen is partially covered (holdAndFreezes)', () => {
    // transferable = 1000 − (300 − 100) = 800 → lockedTotal = 200; the remaining
    // 100 of the vesting lock comes out of reserved
    const balance = makeBalance({
      free: 1000,
      reserved: 100,
      frozen: 300,
      locks: [makeLock(LockTypes.VESTING, 300)],
      mode: 'holdAndFreezes',
    });

    const split = splitBalanceByType(balance);

    expect(split.transferable.toNumber()).toEqual(800);
    expect(split.vested.toNumber()).toEqual(300);
    expect(split.reserved.toNumber()).toEqual(0);
    expect(split.locked.toNumber()).toEqual(0);
  });

  test('reports reserved separately from locked', () => {
    const balance = makeBalance({ free: 1000, reserved: 200, frozen: 300, locks: [makeLock(LockTypes.VESTING, 300)] });

    const split = splitBalanceByType(balance);

    expect(split.transferable.toNumber()).toEqual(700);
    expect(split.reserved.toNumber()).toEqual(200);
    expect(split.vested.toNumber()).toEqual(300);
    expect(split.locked.toNumber()).toEqual(0);
  });

  test('carves the whole vesting lock out of reserved when reserved fully absorbs it (holdAndFreezes)', () => {
    // Semantic change vs the old min(vestedLockedAmount, locked) clamp: there the
    // reserve absorbed the vesting lock and Vested read 0. Now the uncovered
    // vesting lock is carved out of reserved so it stays visible — vested = 100,
    // reserved drops to 0.
    const balance = makeBalance({
      free: 100,
      reserved: 100,
      frozen: 100,
      locks: [makeLock(LockTypes.VESTING, 100)],
      mode: 'holdAndFreezes',
    });

    const split = splitBalanceByType(balance);

    expect(split.transferable.toNumber()).toEqual(100);
    expect(split.reserved.toNumber()).toEqual(0);
    expect(split.locked.toNumber()).toEqual(0);
    expect(split.vested.toNumber()).toEqual(100);
  });

  test('partitions a multi-lock balance so the four buckets sum to the total', () => {
    // free=700, reserved=300, frozen=500 (holdAndFreezes) with a governance lock
    // of 500 and a vesting lock of 200 riding inside it.
    // transferable = 700 − max(0, 500 − 300) = 500; lockedTotal = 1000 − 500 − 300 = 200;
    // vesting (200) is carved out of locked → locked 0, vested 200, reserved stays 300.
    const balance = makeBalance({
      free: 700,
      reserved: 300,
      frozen: 500,
      locks: [makeLock(GOVERNANCE_LOCK, 500), makeLock(LockTypes.VESTING, 200)],
      mode: 'holdAndFreezes',
    });

    const split = splitBalanceByType(balance);

    expect(split.transferable.toNumber()).toEqual(500);
    expect(split.reserved.toNumber()).toEqual(300);
    expect(split.locked.toNumber()).toEqual(0);
    expect(split.vested.toNumber()).toEqual(200);

    const total = split.transferable.add(split.reserved).add(split.locked).add(split.vested);
    expect(total.toNumber()).toEqual(1000); // free + reserved
  });
});
