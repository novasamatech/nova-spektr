import { BN } from '@polkadot/util';
import { describe, expect, it } from 'vitest';

import { type Asset, type BalanceMap, type Chain, type ChainId, AssetType } from '@/shared/core';
import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { type VestingData, type VestingScheduleInfo } from '@/domains/vesting';

import { computeVesting } from './views';

const ACCOUNT = '0x00'.padEnd(66, '1') as AccountId;

const ASSET_HUB = '0xassethub' as ChainId;
const RELAY = '0xrelay' as ChainId;

const KSM: Asset = { assetId: 0, symbol: 'KSM', precision: 12, type: AssetType.NATIVE, name: 'Kusama' } as Asset;

/**
 * Kusama Asset Hub as configured in `chains.json`: it holds the vesting, but
 * pallet_vesting there counts in _relay_ blocks, and its own `defaultBlockTime`
 * (2s) is three times the relay's (6s) — mixing the two is what overstated the
 * daily unlock threefold.
 */
const assetHub = (): Chain =>
  ({
    chainId: ASSET_HUB,
    name: 'Kusama Asset Hub',
    assets: [KSM],
    options: [],
    additional: { timelineChain: RELAY, defaultBlockTime: 2000 },
  }) as unknown as Chain;

const RELAY_BLOCK_TIME = new BN(6000);
const BLOCKS_PER_DAY = 14_400;

const schedule = (locked: number, perBlock: number, startingBlock: number): VestingScheduleInfo => ({
  locked: new BN(locked),
  perBlock: new BN(perBlock),
  startingBlock: new BN(startingBlock),
});

type Over = {
  schedules?: VestingScheduleInfo[];
  lock?: number;
  currentBlock?: number;
  blockTimes?: Record<ChainId, BN>;
  /**
   * Heights as published. Defaults to the relay's; `{}` stands for "not known
   * yet".
   */
  heights?: Record<ChainId, BlockHeight>;
};

const compute = ({ schedules = [], lock = 0, currentBlock = 0, blockTimes, heights }: Over) => {
  const data: VestingData = {
    schedules: { [ASSET_HUB]: { [ACCOUNT]: schedules } },
    locks: { [ASSET_HUB]: { [ACCOUNT]: new BN(lock) } },
  };

  return computeVesting({
    data,
    chains: { [ASSET_HUB]: assetHub() } as Record<ChainId, Chain>,
    balances: {} as BalanceMap,
    // Only the relay's height is published — the Asset Hub's own is irrelevant
    // to schedules denominated in relay blocks.
    currentBlock: heights ?? ({ [RELAY]: currentBlock as BlockHeight } as Record<ChainId, BlockHeight>),
    blockTimes: blockTimes ?? ({ [RELAY]: RELAY_BLOCK_TIME } as Record<ChainId, BN>),
    availableAccounts: [] as AnyAccount[],
    claimResolutions: new Map(),
    prices: {},
    currency: null,
  });
};

// The schedules the reporter's CSV actually produced on Kusama Asset Hub: a
// 0.05 KSM vested transfer with a cliff, stored as a single-block release of the
// cliff amount plus the remainder vesting over 999 blocks. Both start at the
// same block, about an hour and a half out at the time of the report.
const START = 34_364_257;
const CLIFF = schedule(50_000_000, 50_000_000, START);
const GRADUAL = schedule(49_950_000_000, 50_000_000, START);
const TOTAL_LOCK = 50_000_000_000; // 0.05 KSM at 12 decimals

describe('computeVesting — the daily unlock', () => {
  it('never reports a day releasing more than the account actually holds', () => {
    const { accountViews } = compute({
      schedules: [CLIFF, GRADUAL],
      lock: TOTAL_LOCK,
      currentBlock: START - 1,
    });

    const view = accountViews[0]!;

    // The old `perBlockRate × blocksPerDay` said 100 000 000 × 14 400 =
    // 1 440 000 000 000 planks (1.44 KSM) a day — 29x the 0.05 KSM that exists.
    // Both schedules complete within the day, so the day releases exactly the lot.
    expect(view.perDayRate?.toString()).toBe(String(TOTAL_LOCK));
    expect(view.stillLocked.toString()).toBe(String(TOTAL_LOCK));
  });

  it('is the sum of what each schedule releases, and zero for one that has not begun', () => {
    // A day before the start block, nothing of either schedule falls in the window.
    const { accountViews } = compute({
      schedules: [CLIFF, GRADUAL],
      lock: TOTAL_LOCK,
      currentBlock: START - BLOCKS_PER_DAY - 1,
    });

    const view = accountViews[0]!;

    expect(view.perDayRate?.toString()).toBe('0');
    expect(view.schedules.map(s => s.perDayRate?.toString())).toEqual(['0', '0']);
  });

  it('is the plain per-block rate for a schedule with more than a day left to run', () => {
    const long = schedule(1_000_000_000_000, 1_000_000, 0);

    const { accountViews } = compute({ schedules: [long], lock: 1_000_000_000_000, currentBlock: 10 });

    expect(accountViews[0]?.perDayRate?.toString()).toBe(String(1_000_000 * BLOCKS_PER_DAY));
  });

  it('holds back the rate entirely until the timeline chain reports its block time', () => {
    const { accountViews, summary } = compute({
      schedules: [GRADUAL],
      lock: TOTAL_LOCK,
      currentBlock: START,
      blockTimes: {} as Record<ChainId, BN>,
    });

    expect(accountViews[0]?.perDayRate).toBeNull();
    expect(summary.perDayFiat.toString()).toBe('0');
  });
});

describe('computeVesting — cliff and start', () => {
  it('marks only the single-block schedule a cliff, and dates both from the start block', () => {
    const { accountViews } = compute({
      schedules: [CLIFF, GRADUAL],
      lock: TOTAL_LOCK,
      currentBlock: START - 600, // 600 relay blocks = 1h out
    });

    const [cliff, gradual] = accountViews[0]!.schedules;

    expect(cliff?.isCliff).toBe(true);
    expect(gradual?.isCliff).toBe(false);

    // Neither has started, so both carry a projected start.
    expect(cliff?.hasStarted).toBe(false);
    expect(gradual?.hasStarted).toBe(false);
    expect(cliff?.startsAt).toBeInstanceOf(Date);
    expect(gradual?.startsAt).toBeInstanceOf(Date);

    // 600 blocks × 6s = 1 hour out, on the relay's clock. Against the Asset Hub's
    // 2s it would have read 20 minutes.
    const hourOut = Date.now() + 600 * 6000;
    expect(cliff!.startsAt!.getTime()).toBeGreaterThan(hourOut - 5000);
    expect(cliff!.startsAt!.getTime()).toBeLessThan(hourOut + 5000);
  });

  it('drops the start date once the schedule is under way', () => {
    const { accountViews } = compute({ schedules: [GRADUAL], lock: TOTAL_LOCK, currentBlock: START + 10 });

    const [gradual] = accountViews[0]!.schedules;

    expect(gradual?.hasStarted).toBe(true);
    expect(gradual?.startsAt).toBeNull();
    expect(gradual?.fullyUnlocksAt).toBeInstanceOf(Date);
  });

  it('leaves a finished schedule with no rate and no dates', () => {
    const { accountViews } = compute({ schedules: [CLIFF], lock: 0, currentBlock: START + 5 });

    const [cliff] = accountViews[0]!.schedules;

    expect(cliff?.lockedNow.toString()).toBe('0');
    expect(cliff?.perDayRate).toBeNull();
    expect(cliff?.fullyUnlocksAt).toBeNull();
    expect(cliff?.startsAt).toBeNull();
  });
});

describe('computeVesting — the summary', () => {
  it('announces a claim on the token amount, with no price feed in sight', () => {
    // No currency and no price entry, as on a dev chain or a newly listed token:
    // every fiat figure is zero, yet the claim is perfectly real, the rows show a
    // claim button — and the callout badge used to disagree with them, because it
    // was read off the fiat total.
    const { accountViews, summary } = compute({
      schedules: [CLIFF, GRADUAL],
      lock: TOTAL_LOCK,
      currentBlock: START + 1,
    });

    expect(accountViews[0]!.claimable.gtn(0)).toBe(true);
    expect(summary.claimableFiat.toString()).toBe('0');
    expect(summary.hasClaim).toBe(true);
  });

  it('counts only the schedules it could build rows for', () => {
    // The relay's height has not landed, so not a figure on this Asset Hub can be
    // computed and no row is built. The count must not advertise schedules the
    // modal has nothing to show for.
    const { accountViews, summary } = compute({
      schedules: [CLIFF, GRADUAL],
      lock: TOTAL_LOCK,
      heights: {} as Record<ChainId, BlockHeight>,
    });

    expect(accountViews).toEqual([]);
    expect(summary.schedulesCount).toBe(0);
    expect(summary.hasClaim).toBe(false);

    // With the height, both schedules are counted.
    expect(compute({ schedules: [CLIFF, GRADUAL], lock: TOTAL_LOCK, currentBlock: START }).summary.schedulesCount).toBe(
      2,
    );
  });
});
