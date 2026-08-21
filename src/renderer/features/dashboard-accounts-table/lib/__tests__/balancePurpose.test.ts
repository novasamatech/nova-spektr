import { BN } from '@polkadot/util';

import { type Balance, LockTypes } from '@/shared/core';
import { splitBalanceByPurpose } from '../balancePurpose';

type AssetLock = Balance['locked'][number];

const makeLock = (type: LockTypes, amount: number): AssetLock => ({ type, amount: new BN(amount) });

const makeBalance = (params: {
  free: number;
  reserved?: number;
  frozen: number;
  locks?: AssetLock[];
  mode?: 'legacy' | 'holdAndFreezes';
}): Balance => {
  // structural balance fixture, matching the fields splitBalanceByPurpose reads
  const balance = {
    free: new BN(params.free),
    reserved: new BN(params.reserved ?? 0),
    frozen: new BN(params.frozen),
    locked: params.locks ?? [],
    transferableMode: params.mode ?? 'legacy',
  };

  return balance as unknown as Balance;
};

describe('splitBalanceByPurpose', () => {
  it('partitions into transferable/staked/governance/other summing to free + reserved', () => {
    // free 1000, reserved 500 (staking hold, ledger active 500), conviction lock
    // 200 rides on frozen beyond the hold: diff = 700 − 500 = 200,
    // transferable = 1000 − 200 = 800, pot = 1500 − 800 = 700
    const balance = makeBalance({
      free: 1000,
      reserved: 500,
      frozen: 700,
      locks: [makeLock(LockTypes.CONVICTION_VOTE, 200)],
      mode: 'holdAndFreezes',
    });

    const split = splitBalanceByPurpose(balance, new BN(500), true);

    expect(split.transferable.toString()).toEqual('800');
    expect(split.staked?.toString()).toEqual('500');
    expect(split.governance?.toString()).toEqual('200');
    expect(split.other.toString()).toEqual('0');

    const sum = split.transferable
      .add(split.staked ?? new BN(0))
      .add(split.governance ?? new BN(0))
      .add(split.other);
    expect(sum.toString()).toEqual('1500');
  });

  it('returns null staked when not applicable and never converts it to zero', () => {
    // legacy: transferable = 1000 − 200 = 800; pot = 1000 − 800 = 200; no staking
    // ledger on this chain/asset
    const balance = makeBalance({ free: 1000, frozen: 200 });

    const split = splitBalanceByPurpose(balance, null, true);

    expect(split.staked).toBeNull();
    expect(split.transferable.toString()).toEqual('800');
    expect(split.other.toString()).toEqual('200');
  });

  it('returns null governance for non-native assets', () => {
    // legacy: transferable = 1000 − 300 = 700; pot = 1000 − 700 = 300; ledger 100
    // staked, governance not applicable on this asset
    const balance = makeBalance({ free: 1000, frozen: 300 });

    const split = splitBalanceByPurpose(balance, new BN(100), false);

    expect(split.governance).toBeNull();
    expect(split.staked?.toString()).toEqual('100');
    expect(split.transferable.toString()).toEqual('700');
    expect(split.other.toString()).toEqual('200');
  });

  it('caps staked by the non-transferable pot (overlap floor)', () => {
    // legacy: transferable = 1000 − 500 = 500; pot = 1000 − 500 = 500; ledger
    // reports 900 active but only 500 is non-transferable
    const balance = makeBalance({ free: 1000, frozen: 500 });

    const split = splitBalanceByPurpose(balance, new BN(900), true);

    expect(split.staked?.toString()).toEqual('500');
    expect(split.governance?.toString()).toEqual('0');
    expect(split.other.toString()).toEqual('0');
  });

  it('floors other at zero when locks overlap (frozen is a max, not a sum)', () => {
    // legacy: transferable = 1000 − 800 = 200; pot = 1000 − 200 = 800; staked 600
    // leaves 200; conviction lock reports 800 but is capped to the 200 left
    const balance = makeBalance({
      free: 1000,
      frozen: 800,
      locks: [makeLock(LockTypes.CONVICTION_VOTE, 800)],
    });

    const split = splitBalanceByPurpose(balance, new BN(600), true);

    expect(split.staked?.toString()).toEqual('600');
    expect(split.governance?.toString()).toEqual('200');
    expect(split.other.toString()).toEqual('0');
  });

  it('leaves a vesting lock inside other, never as a bucket of its own', () => {
    // legacy: transferable = 1000 − 400 = 600; pot = 1000 − 600 = 400; no
    // staking, no governance locks — vesting lock of 300 rides inside frozen
    const balance = makeBalance({
      free: 1000,
      frozen: 400,
      locks: [makeLock(LockTypes.VESTING, 300)],
    });

    const split = splitBalanceByPurpose(balance, null, true);

    expect(split.other.toString()).toEqual('400');
    expect(split.staked).toBeNull();
    expect(split.governance?.toString()).toEqual('0');
  });
});
