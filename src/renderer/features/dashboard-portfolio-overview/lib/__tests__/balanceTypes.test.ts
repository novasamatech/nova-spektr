import { BN } from '@polkadot/util';

import { type Balance, LockTypes } from '@/shared/core';
import { splitBalanceByType, vestingOverlapBN } from '../balanceTypes';

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

  test('keeps reserved intact when frozen is fully covered by reserved (holdAndFreezes)', () => {
    // holdAndFreezes: transferable = free − max(0, frozen − reserved) — a vesting
    // lock covered by a big reserve leaves the locked bucket empty; reserved has
    // its own causes (holds), so the vesting lock never carves into it
    const balance = makeBalance({
      free: 1000,
      reserved: 500,
      frozen: 300,
      locks: [makeLock(LockTypes.VESTING, 300)],
      mode: 'holdAndFreezes',
    });

    const split = splitBalanceByType(balance);

    expect(split.transferable.toNumber()).toEqual(1000);
    expect(split.vested.toNumber()).toEqual(0);
    expect(split.reserved.toNumber()).toEqual(500);
    expect(split.locked.toNumber()).toEqual(0);
  });

  test('caps vested by the locked bucket when frozen is partially covered by reserved (holdAndFreezes)', () => {
    // transferable = 1000 − (300 − 100) = 800 → lockedTotal = 200; only the part
    // of the vesting lock that lives in the locked bucket shows as vested
    const balance = makeBalance({
      free: 1000,
      reserved: 100,
      frozen: 300,
      locks: [makeLock(LockTypes.VESTING, 300)],
      mode: 'holdAndFreezes',
    });

    const split = splitBalanceByType(balance);

    expect(split.transferable.toNumber()).toEqual(800);
    expect(split.vested.toNumber()).toEqual(200);
    expect(split.reserved.toNumber()).toEqual(100);
    expect(split.locked.toNumber()).toEqual(0);
  });

  test('does not relabel a staking hold as vested when a vesting lock overlaps it (holdAndFreezes)', () => {
    // staking hold in reserved + vesting lock over the same account: transferable
    // = 600 − (600 − 400) = 400, lockedTotal = 200 — the 400 staking hold stays
    // reserved, only the uncovered 200 of the vesting lock shows as vested
    const balance = makeBalance({
      free: 600,
      reserved: 400,
      frozen: 600,
      locks: [makeLock(LockTypes.VESTING, 600)],
      mode: 'holdAndFreezes',
    });

    const split = splitBalanceByType(balance);

    expect(split.transferable.toNumber()).toEqual(400);
    expect(split.reserved.toNumber()).toEqual(400);
    expect(split.vested.toNumber()).toEqual(200);
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

  test('leaves a vesting lock fully absorbed by reserved invisible (holdAndFreezes)', () => {
    // the freeze rides entirely on reserved funds: the reserve keeps its own
    // label rather than being relabelled vested — vested reads 0
    const balance = makeBalance({
      free: 100,
      reserved: 100,
      frozen: 100,
      locks: [makeLock(LockTypes.VESTING, 100)],
      mode: 'holdAndFreezes',
    });

    const split = splitBalanceByType(balance);

    expect(split.transferable.toNumber()).toEqual(100);
    expect(split.reserved.toNumber()).toEqual(100);
    expect(split.locked.toNumber()).toEqual(0);
    expect(split.vested.toNumber()).toEqual(0);
  });

  test('sums multiple vesting locks into vested', () => {
    // two separate VESTING locks (400 + 200) frozen = max(400, 200)… but real
    // chains report frozen as the sum when both are vesting; here frozen = 600
    // and both locks must be aggregated, not just the first (400)
    const balance = makeBalance({
      free: 1000,
      frozen: 600,
      locks: [makeLock(LockTypes.VESTING, 400), makeLock(LockTypes.VESTING, 200)],
    });

    const split = splitBalanceByType(balance);

    expect(split.transferable.toNumber()).toEqual(400);
    expect(split.vested.toNumber()).toEqual(600);
    expect(split.locked.toNumber()).toEqual(0);
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

/**
 * `frozen` is a floor on `free + reserved`, so a hold can satisfy a vesting
 * lock outright — see the doc on `vestingOverlapBN`. That case is invisible to
 * the partition above, and this is what recovers it.
 */
describe('vestingOverlapBN', () => {
  test('reports the whole vesting lock when reserved covers it entirely', () => {
    // free=1000, reserved=800, frozen=600 → nothing in free is untouchable
    // (600 − 800 < 0), so the partition sees no vesting at all.
    const balance = makeBalance({
      free: 1000,
      reserved: 800,
      frozen: 600,
      locks: [makeLock(LockTypes.VESTING, 600)],
      mode: 'holdAndFreezes',
    });

    expect(splitBalanceByType(balance).vested.toNumber()).toEqual(0);
    expect(vestingOverlapBN(balance).toNumber()).toEqual(600);
  });

  test('reports only the part reserved covers when the lock straddles both', () => {
    // free=1000, reserved=200, frozen=600 → transferable = 1000 − 400 = 600,
    // lockedTotal = 1200 − 600 − 200 = 400. So 400 of the lock bites into free
    // and the remaining 200 rides on reserved.
    const balance = makeBalance({
      free: 1000,
      reserved: 200,
      frozen: 600,
      locks: [makeLock(LockTypes.VESTING, 600)],
      mode: 'holdAndFreezes',
    });

    expect(splitBalanceByType(balance).vested.toNumber()).toEqual(400);
    expect(vestingOverlapBN(balance).toNumber()).toEqual(200);
  });

  test('reports nothing when the partition already accounts for the lock', () => {
    const balance = makeBalance({ free: 1000, frozen: 600, locks: [makeLock(LockTypes.VESTING, 600)] });

    expect(splitBalanceByType(balance).vested.toNumber()).toEqual(600);
    expect(vestingOverlapBN(balance).toNumber()).toEqual(0);
  });

  test('reports nothing for a balance with no vesting lock', () => {
    const balance = makeBalance({
      free: 700,
      reserved: 300,
      frozen: 500,
      locks: [makeLock(GOVERNANCE_LOCK, 500)],
      mode: 'holdAndFreezes',
    });

    expect(vestingOverlapBN(balance).toNumber()).toEqual(0);
  });

  test('never exceeds the balance it freezes', () => {
    // a lock read against a since-reduced balance must not overstate
    const balance = makeBalance({
      free: 100,
      reserved: 50,
      frozen: 600,
      locks: [makeLock(LockTypes.VESTING, 600)],
      mode: 'holdAndFreezes',
    });

    const split = splitBalanceByType(balance);
    expect(split.vested.add(vestingOverlapBN(balance)).toNumber()).toEqual(150); // free + reserved
  });
});
