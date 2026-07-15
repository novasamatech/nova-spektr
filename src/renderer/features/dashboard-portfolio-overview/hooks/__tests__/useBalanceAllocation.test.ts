import { BN } from '@polkadot/util';

import { LockTypes } from '@/shared/core';
import { computeBalanceAllocation } from '../useBalanceAllocation';

// --- helpers to build mock data ---

const makeBN = (n: number) => new BN(n);

const makeBalance = (overrides: {
  accountId: string;
  chainId: string;
  assetId: number;
  free: number;
  reserved: number;
  frozen: number;
  vestingLock?: number;
  stakingLock?: number;
  transferableMode?: 'holdAndFreezes' | 'legacy';
}) => ({
  id: `${overrides.chainId}-${overrides.accountId}-${overrides.assetId}`,
  chainId: overrides.chainId,
  accountId: overrides.accountId,
  assetId: overrides.assetId,
  assetType: 'native',
  providers: 1,
  consumers: 0,
  sufficients: 0,
  transferableMode: overrides.transferableMode ?? 'holdAndFreezes',
  ed: makeBN(0),
  free: makeBN(overrides.free),
  reserved: makeBN(overrides.reserved),
  frozen: makeBN(overrides.frozen),
  locked: [
    ...(overrides.vestingLock ? [{ type: LockTypes.VESTING, amount: makeBN(overrides.vestingLock) }] : []),
    ...(overrides.stakingLock ? [{ type: LockTypes.STAKING, amount: makeBN(overrides.stakingLock) }] : []),
  ],
});

const makeChains = () => ({
  chain1: {
    assets: [{ assetId: 0, priceId: 'polkadot', symbol: 'DOT', precision: 0, name: 'DOT' }],
  },
});

const makePrices = () => ({ polkadot: { usd: { price: 1, change: 0 } } });
const currency = { coingeckoId: 'usd' };

const compute = (balances: ReturnType<typeof makeBalance>[], accountIds: string[]) =>
  computeBalanceAllocation({
    accountIds,
    balanceMap: Object.fromEntries(balances.map((b) => [b.id, b])) as any,
    chains: makeChains() as any,
    prices: makePrices(),
    currency,
  });

// --- tests ---

describe('computeBalanceAllocation', () => {
  test('reports no vesting when reserved already absorbs the vesting lock', () => {
    // reducible_balance discounts reserved from frozen: untouchable = max(0, 100 - 100) = 0.
    // The 100 vesting lock restricts nothing here, so it must not show up as Vested.
    const balances = [
      makeBalance({
        accountId: 'acc1',
        chainId: 'chain1',
        assetId: 0,
        free: 100,
        reserved: 100,
        frozen: 100,
        vestingLock: 100,
      }),
    ];

    const result = compute(balances, ['acc1'])!;

    expect(result.transferablePct).toBeCloseTo(50);
    expect(result.reservedPct).toBeCloseTo(50);
    expect(result.lockedPct).toBeCloseTo(0);
    expect(result.vestedPct).toBeCloseTo(0);
  });

  test('reports vesting as its own slice taken out of locked', () => {
    // free=100, frozen=40 (the vesting lock is the only lock) -> transferable 60, all 40 locked is vesting.
    const balances = [
      makeBalance({
        accountId: 'acc1',
        chainId: 'chain1',
        assetId: 0,
        free: 100,
        reserved: 0,
        frozen: 40,
        vestingLock: 40,
      }),
    ];

    const result = compute(balances, ['acc1'])!;

    expect(result.transferablePct).toBeCloseTo(60);
    expect(result.vestedPct).toBeCloseTo(40);
    expect(result.lockedPct).toBeCloseTo(0);
    expect(result.reservedPct).toBeCloseTo(0);
  });

  test('splits locked between a competing lock and vesting', () => {
    const balances = [
      makeBalance({
        accountId: 'acc1',
        chainId: 'chain1',
        assetId: 0,
        free: 100,
        reserved: 0,
        frozen: 60,
        vestingLock: 40,
        stakingLock: 60,
      }),
    ];

    const result = compute(balances, ['acc1'])!;

    expect(result.transferablePct).toBeCloseTo(40);
    expect(result.lockedPct).toBeCloseTo(20); // 60 frozen - 40 vesting
    expect(result.vestedPct).toBeCloseTo(40);
  });

  test('never lets one account vesting lock eat another account locked share', () => {
    // acc1's vesting lock is fully absorbed by its reserved, so it contributes no Vested at all.
    // acc2 has 100 staked and no vesting. A portfolio-wide clamp would wrongly move 100 of acc2's
    // Locked into Vested; a per-balance clamp keeps acc2's Locked intact.
    const balances = [
      makeBalance({
        accountId: 'acc1',
        chainId: 'chain1',
        assetId: 0,
        free: 100,
        reserved: 100,
        frozen: 100,
        vestingLock: 100,
      }),
      makeBalance({
        accountId: 'acc2',
        chainId: 'chain1',
        assetId: 0,
        free: 100,
        reserved: 0,
        frozen: 100,
        stakingLock: 100,
      }),
    ];

    const result = compute(balances, ['acc1', 'acc2'])!;

    // total = 300 (acc1 free 100 + reserved 100, acc2 free 100)
    expect(result.vestedPct).toBeCloseTo(0);
    expect(result.lockedPct).toBeCloseTo(33.33, 1); // acc2's 100, untouched
    expect(result.transferablePct).toBeCloseTo(33.33, 1); // acc1's free 100
    expect(result.reservedPct).toBeCloseTo(33.33, 1); // acc1's reserved 100
  });

  test('the four categories always sum to 100%', () => {
    const balances = [
      makeBalance({
        accountId: 'acc1',
        chainId: 'chain1',
        assetId: 0,
        free: 700,
        reserved: 300,
        frozen: 500,
        vestingLock: 200,
        stakingLock: 500,
      }),
    ];

    const result = compute(balances, ['acc1'])!;
    const sum = result.transferablePct + result.lockedPct + result.reservedPct + result.vestedPct;

    expect(sum).toBeCloseTo(100);
  });

  test('reports no vesting when the account has no vesting lock', () => {
    const balances = [
      makeBalance({
        accountId: 'acc1',
        chainId: 'chain1',
        assetId: 0,
        free: 100,
        reserved: 0,
        frozen: 40,
        stakingLock: 40,
      }),
    ];

    const result = compute(balances, ['acc1'])!;

    expect(result.vestedPct).toBe(0);
    expect(result.lockedPct).toBeCloseTo(40);
  });

  test('returns null when the selection holds nothing priced', () => {
    const balances = [
      makeBalance({ accountId: 'acc1', chainId: 'chain1', assetId: 0, free: 0, reserved: 0, frozen: 0 }),
    ];

    expect(compute(balances, ['acc1'])).toBeNull();
    expect(compute(balances, ['acc-other'])).toBeNull();
  });
});
