import { BN, BN_ZERO } from '@polkadot/util';
import { describe, expect, it } from 'vitest';

import {
  getMaxAmount,
  getRemainingStake,
  hasReachedUnlockingLimit,
  isBelowMinimumBond,
  isFullUnbond,
  projectUnlockAt,
  shouldChill,
} from './amount-rules';

// Planck figures on purpose: 10 DOT is already 1e11, and the numbers this flow
// handles routinely exceed `Number.MAX_SAFE_INTEGER`.
const DOT = (whole: number) => new BN(whole).mul(new BN('10000000000'));

const MIN_BOND = DOT(250);
const STAKE = DOT(1000);

describe('getRemainingStake', () => {
  it('subtracts the amount from the active stake', () => {
    expect(getRemainingStake({ activeStake: STAKE, amount: DOT(400) }).toString()).toBe(DOT(600).toString());
  });

  it('clamps at zero when the amount exceeds the stake', () => {
    expect(getRemainingStake({ activeStake: STAKE, amount: DOT(1500) }).toString()).toBe('0');
  });

  it('survives figures beyond Number.MAX_SAFE_INTEGER', () => {
    const huge = new BN('123456789012345678901234567890');
    const remaining = getRemainingStake({ activeStake: huge, amount: new BN('1') });

    expect(remaining.toString()).toBe('123456789012345678901234567889');
  });
});

describe('isFullUnbond', () => {
  it('is true for exactly the whole stake', () => {
    expect(isFullUnbond({ activeStake: STAKE, amount: STAKE })).toBe(true);
  });

  it('is true when the amount overshoots the stake', () => {
    expect(isFullUnbond({ activeStake: STAKE, amount: DOT(1001) })).toBe(true);
  });

  it('is false one planck short of the whole stake', () => {
    expect(isFullUnbond({ activeStake: STAKE, amount: STAKE.subn(1) })).toBe(false);
  });

  it('is false for an empty amount, even against an empty stake', () => {
    expect(isFullUnbond({ activeStake: BN_ZERO, amount: BN_ZERO })).toBe(false);
  });
});

describe('isBelowMinimumBond', () => {
  it('warns when the remainder falls under the minimum', () => {
    // 1000 − 900 = 100, under the 250 minimum.
    expect(isBelowMinimumBond({ activeStake: STAKE, amount: DOT(900), minimumBond: MIN_BOND })).toBe(true);
  });

  it('does NOT warn when the remainder lands exactly on the minimum', () => {
    // 1000 − 750 = 250 — a position sitting on the minimum is still valid.
    expect(isBelowMinimumBond({ activeStake: STAKE, amount: DOT(750), minimumBond: MIN_BOND })).toBe(false);
  });

  it('does not warn one planck above the minimum', () => {
    const amount = STAKE.sub(MIN_BOND).subn(1);

    expect(isBelowMinimumBond({ activeStake: STAKE, amount, minimumBond: MIN_BOND })).toBe(false);
  });

  it('warns one planck below the minimum', () => {
    const amount = STAKE.sub(MIN_BOND).addn(1);

    expect(isBelowMinimumBond({ activeStake: STAKE, amount, minimumBond: MIN_BOND })).toBe(true);
  });

  it('does NOT warn on a full unbond — leaving nothing is the intended way out', () => {
    expect(isBelowMinimumBond({ activeStake: STAKE, amount: STAKE, minimumBond: MIN_BOND })).toBe(false);
  });

  it('stays quiet while the minimum is unknown', () => {
    expect(isBelowMinimumBond({ activeStake: STAKE, amount: DOT(900), minimumBond: BN_ZERO })).toBe(false);
  });
});

describe('shouldChill', () => {
  it('chills a full unbond', () => {
    expect(shouldChill({ activeStake: STAKE, amount: STAKE, minimumBond: MIN_BOND })).toBe(true);
  });

  it('chills a full unbond even when the minimum is unknown', () => {
    expect(shouldChill({ activeStake: STAKE, amount: STAKE, minimumBond: BN_ZERO })).toBe(true);
  });

  it('chills when the remainder drops below the minimum', () => {
    expect(shouldChill({ activeStake: STAKE, amount: DOT(900), minimumBond: MIN_BOND })).toBe(true);
  });

  it('does NOT chill at exactly the minimum — the nomination stays valid', () => {
    expect(shouldChill({ activeStake: STAKE, amount: DOT(750), minimumBond: MIN_BOND })).toBe(false);
  });

  it('does not chill a partial unbond that leaves plenty behind', () => {
    expect(shouldChill({ activeStake: STAKE, amount: DOT(100), minimumBond: MIN_BOND })).toBe(false);
  });

  it('does not chill on an empty amount', () => {
    expect(shouldChill({ activeStake: STAKE, amount: BN_ZERO, minimumBond: MIN_BOND })).toBe(false);
  });
});

describe('getMaxAmount', () => {
  it('unbond maxes out at the active stake, ignoring the wallet balance', () => {
    expect(getMaxAmount('unbond', { activeStake: STAKE, available: DOT(5) }).toString()).toBe(STAKE.toString());
  });

  it('add stake maxes out at what is available, ignoring the stake', () => {
    expect(getMaxAmount('addStake', { activeStake: STAKE, available: DOT(5) }).toString()).toBe(DOT(5).toString());
  });

  it('never offers a negative maximum when the fee exceeds the balance', () => {
    expect(getMaxAmount('addStake', { activeStake: STAKE, available: DOT(1).neg() }).toString()).toBe('0');
  });
});

describe('projectUnlockAt', () => {
  const anchor = { eraStartMs: 1_000_000, eraDurationMs: 86_400_000 };

  it('projects bondingDuration full eras past the era start', () => {
    expect(projectUnlockAt({ eraAnchor: anchor, bondingDuration: 28, nowMs: 1_000_000 })).toBe(
      1_000_000 + 28 * 86_400_000,
    );
  });

  it('never returns a moment in the past when the anchor has gone stale', () => {
    const now = 1_000_000 + 40 * 86_400_000;

    expect(projectUnlockAt({ eraAnchor: anchor, bondingDuration: 28, nowMs: now })).toBe(now);
  });

  it('returns null without an anchor, rather than guessing a date', () => {
    expect(projectUnlockAt({ eraAnchor: null, bondingDuration: 28, nowMs: 0 })).toBeNull();
  });

  it('returns null without a bonding duration', () => {
    expect(projectUnlockAt({ eraAnchor: anchor, bondingDuration: null, nowMs: 0 })).toBeNull();
  });

  it('returns null for a nonsensical era duration', () => {
    expect(
      projectUnlockAt({ eraAnchor: { eraStartMs: 1_000, eraDurationMs: 0 }, bondingDuration: 28, nowMs: 0 }),
    ).toBeNull();
  });
});

describe('hasReachedUnlockingLimit', () => {
  it('blocks once the ledger holds as many chunks as the runtime allows', () => {
    expect(hasReachedUnlockingLimit({ chunkCount: 32, maxUnlockingChunks: 32 })).toBe(true);
  });

  it('allows one more chunk right below the limit', () => {
    expect(hasReachedUnlockingLimit({ chunkCount: 31, maxUnlockingChunks: 32 })).toBe(false);
  });

  it('does not guard when the runtime does not expose the limit', () => {
    expect(hasReachedUnlockingLimit({ chunkCount: 99, maxUnlockingChunks: null })).toBe(false);
  });
});
