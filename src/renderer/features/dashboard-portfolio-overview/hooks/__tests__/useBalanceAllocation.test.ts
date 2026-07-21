import { BN } from '@polkadot/util';

import { type Asset, type Balance, type Chain, LockTypes } from '@/shared/core';
import { type PriceObject } from '@/domains/price';
import { computeBalanceAllocation } from '../useBalanceAllocation';

type AssetLock = Balance['locked'][number];

const GOVERNANCE_LOCK = LockTypes.CONVICTION_VOTE;
const CURRENCY = { coingeckoId: 'usd' };

const makeLock = (type: LockTypes, amount: number): AssetLock => ({ type, amount: new BN(amount) });

const makeBalance = (params: {
  accountId: string;
  chainId: string;
  assetId: number;
  free: number;
  reserved?: number;
  frozen: number;
  locks?: AssetLock[];
  mode?: 'legacy' | 'holdAndFreezes';
}): Balance => {
  // structural balance fixture, matching the fields computeBalanceAllocation +
  // splitBalanceByType read (legacy transferable mode)
  const balance = {
    accountId: params.accountId,
    chainId: params.chainId,
    assetId: params.assetId,
    free: new BN(params.free),
    reserved: new BN(params.reserved ?? 0),
    frozen: new BN(params.frozen),
    locked: params.locks ?? [],
    transferableMode: params.mode ?? 'legacy',
  };

  return balance as unknown as Balance;
};

const makeAsset = (assetId: number, priceId?: string): Asset => {
  return { assetId, priceId, precision: 0, symbol: `T${assetId}`, name: `Token${assetId}` } as unknown as Asset;
};

const makeChain = (chainId: string, assets: Asset[]): Chain => {
  return { chainId, assets } as unknown as Chain;
};

const indexByKey = <T>(list: T[], keyOf: (item: T) => string) => new Map(list.map((item) => [keyOf(item), item]));

// a single priced asset priced at 1 unit / token so fiat === raw tokens
const PRICES: PriceObject = { dot: { usd: { price: 1, change: 0 } } };

describe('computeBalanceAllocation', () => {
  test('returns null when no balance has a priced asset', () => {
    // asset without priceId → never priced, and no vesting lock → nothing to surface
    const chains = { net1: makeChain('net1', [makeAsset(1)]) };
    const balanceMap = {
      'a-net1-1': makeBalance({ accountId: 'a', chainId: 'net1', assetId: 1, free: 1000, frozen: 0 }),
    };

    const result = computeBalanceAllocation({
      accountIds: ['a'],
      balanceMap,
      chains,
      prices: PRICES,
      currency: CURRENCY,
    });

    expect(result).toBeNull();
  });

  test('surfaces a vesting lock on an unpriced chain as a token entry', () => {
    // legacy: transferable = 1000 − 600 = 400; lockedTotal = 600; vesting 600 → vested 600
    const chains = { net1: makeChain('net1', [makeAsset(1)]) };
    const balanceMap = {
      'a-net1-1': makeBalance({
        accountId: 'a',
        chainId: 'net1',
        assetId: 1,
        free: 1000,
        frozen: 600,
        locks: [makeLock(LockTypes.VESTING, 600)],
      }),
    };

    const result = computeBalanceAllocation({
      accountIds: ['a'],
      balanceMap,
      chains,
      prices: PRICES,
      currency: CURRENCY,
    });

    expect(result).not.toBeNull();
    // no priced asset contributes fiat — every type stays at zero
    for (const total of Object.values(result!.types)) {
      expect(total.fiat).toEqual('0');
    }
    expect(result!.unpricedVested).toHaveLength(1);
    expect(result!.unpricedVested[0]!.asset.assetId).toEqual(1);
    expect(result!.unpricedVested[0]!.tokens.toString()).toEqual('600');
  });

  test('produces two entries for two different unpriced assets', () => {
    const chains = {
      net1: makeChain('net1', [makeAsset(1)]),
      net2: makeChain('net2', [makeAsset(2)]),
    };
    const balanceMap = {
      'a-net1-1': makeBalance({
        accountId: 'a',
        chainId: 'net1',
        assetId: 1,
        free: 1000,
        frozen: 600,
        locks: [makeLock(LockTypes.VESTING, 600)],
      }),
      // transferable = 500 − 300 = 200; lockedTotal = 300; vesting 300 → vested 300
      'a-net2-2': makeBalance({
        accountId: 'a',
        chainId: 'net2',
        assetId: 2,
        free: 500,
        frozen: 300,
        locks: [makeLock(LockTypes.VESTING, 300)],
      }),
    };

    const result = computeBalanceAllocation({
      accountIds: ['a'],
      balanceMap,
      chains,
      prices: PRICES,
      currency: CURRENCY,
    });

    expect(result!.unpricedVested).toHaveLength(2);
    const byAsset = indexByKey(result!.unpricedVested, (entry) => String(entry.asset.assetId));
    expect(byAsset.get('1')!.tokens.toString()).toEqual('600');
    expect(byAsset.get('2')!.tokens.toString()).toEqual('300');
  });

  test('aggregates the same unpriced asset+chain across two accounts into one summed entry', () => {
    const chains = { net1: makeChain('net1', [makeAsset(1)]) };
    const balanceMap = {
      'a-net1-1': makeBalance({
        accountId: 'a',
        chainId: 'net1',
        assetId: 1,
        free: 1000,
        frozen: 600,
        locks: [makeLock(LockTypes.VESTING, 600)],
      }),
      // transferable = 800 − 400 = 400; lockedTotal = 400; vesting 400 → vested 400
      'b-net1-1': makeBalance({
        accountId: 'b',
        chainId: 'net1',
        assetId: 1,
        free: 800,
        frozen: 400,
        locks: [makeLock(LockTypes.VESTING, 400)],
      }),
    };

    const result = computeBalanceAllocation({
      accountIds: ['a', 'b'],
      balanceMap,
      chains,
      prices: PRICES,
      currency: CURRENCY,
    });

    expect(result!.unpricedVested).toHaveLength(1);
    expect(result!.unpricedVested[0]!.tokens.toString()).toEqual('1000');
  });

  test('keeps per-account locked and vested shares isolated', () => {
    // priced chain: account A vests, account B has a plain governance lock — neither
    // should bleed into the other's bucket
    const chains = { dot: makeChain('dot', [makeAsset(1, 'dot')]) };
    const balanceMap = {
      // A: transferable 400, vested 600
      'a-dot-1': makeBalance({
        accountId: 'a',
        chainId: 'dot',
        assetId: 1,
        free: 1000,
        frozen: 600,
        locks: [makeLock(LockTypes.VESTING, 600)],
      }),
      // B: transferable 700, locked 300
      'b-dot-1': makeBalance({
        accountId: 'b',
        chainId: 'dot',
        assetId: 1,
        free: 1000,
        frozen: 300,
        locks: [makeLock(GOVERNANCE_LOCK, 300)],
      }),
    };

    const result = computeBalanceAllocation({
      accountIds: ['a', 'b'],
      balanceMap,
      chains,
      prices: PRICES,
      currency: CURRENCY,
    });

    expect(result!.types.transferable.fiat).toEqual('1100');
    expect(result!.types.vested.fiat).toEqual('600');
    expect(result!.types.locked.fiat).toEqual('300');
    expect(result!.types.reserved.fiat).toEqual('0');
    // per-type fiats partition the whole 2000 portfolio
    const totalFiat = Object.values(result!.types).reduce((sum, total) => sum + Number(total.fiat), 0);
    expect(totalFiat).toEqual(2000);
    expect(result!.unpricedVested).toHaveLength(0);
  });

  test('routes priced vesting to fiat and unpriced vesting to token entries', () => {
    const chains = {
      dot: makeChain('dot', [makeAsset(1, 'dot')]),
      net1: makeChain('net1', [makeAsset(2)]),
    };
    const balanceMap = {
      // priced: vested 600 → types.vested fiat
      'a-dot-1': makeBalance({
        accountId: 'a',
        chainId: 'dot',
        assetId: 1,
        free: 1000,
        frozen: 600,
        locks: [makeLock(LockTypes.VESTING, 600)],
      }),
      // unpriced: transferable 0, lockedTotal 500, vesting 500 → vested 500 tokens
      'a-net1-2': makeBalance({
        accountId: 'a',
        chainId: 'net1',
        assetId: 2,
        free: 500,
        frozen: 500,
        locks: [makeLock(LockTypes.VESTING, 500)],
      }),
    };

    const result = computeBalanceAllocation({
      accountIds: ['a'],
      balanceMap,
      chains,
      prices: PRICES,
      currency: CURRENCY,
    });

    expect(result!.types.vested.fiat).toEqual('600');
    expect(result!.unpricedVested).toHaveLength(1);
    expect(result!.unpricedVested[0]!.asset.assetId).toEqual(2);
    expect(result!.unpricedVested[0]!.tokens.toString()).toEqual('500');
  });

  /**
   * The case that started this: a staker whose holds already satisfy the
   * vesting lock. The bar can show no vested slice — correct, nothing in `free`
   * is immobilised — but the card must not then claim the user has no vesting
   * while the callout beneath it counts their schedules.
   */
  describe('vesting that rides on reserved', () => {
    const makeStakerWithVesting = () =>
      // free=200, reserved=800, frozen=100 (holdAndFreezes): the 100 vesting lock
      // is fully covered by the 800 held, so the partition attributes it nowhere.
      makeBalance({
        accountId: '0x01',
        chainId: 'polkadot',
        assetId: 0,
        free: 200,
        reserved: 800,
        frozen: 100,
        locks: [makeLock(LockTypes.VESTING, 100)],
        mode: 'holdAndFreezes',
      });

    const compute = (balances: Balance[]) =>
      computeBalanceAllocation({
        accountIds: ['0x01'],
        balanceMap: Object.fromEntries(balances.map((b, i) => [String(i), b])),
        chains: { polkadot: makeChain('polkadot', [makeAsset(0, 'dot')]) },
        prices: PRICES,
        currency: CURRENCY,
      });

    test('reports the overlap instead of dropping it', () => {
      const result = compute([makeStakerWithVesting()]);

      expect(result?.types.vested.fiat).toEqual('0');
      expect(result?.vestedOverlap.fiat).toEqual('100');
      expect(result?.vestedTotalFiat).toEqual('100');
    });

    test('leaves the partition untouched — percentages still sum to 100', () => {
      const result = compute([makeStakerWithVesting()]);

      // reserved must stay the raw chain figure: it is verifiable against a
      // block explorer, and carving vesting out of it would read as a bug.
      expect(result?.types.reserved.fiat).toEqual('800');
      expect(result?.types.transferable.fiat).toEqual('200');

      const sum = (['transferable', 'reserved', 'locked', 'vested'] as const).reduce(
        (acc, type) => acc + result!.types[type].pct,
        0,
      );
      expect(sum).toBeCloseTo(100);
      // the overlap is measured against the same total, so it can be drawn over
      // the segments it covers — but it is not one of them
      expect(result?.vestedOverlap.pct).toBeCloseTo(10);
    });

    test('adds the overlap to the slice when the lock straddles both', () => {
      // free=1000, reserved=200, frozen=600 → 400 bites into free, 200 rides on reserved
      const result = compute([
        makeBalance({
          accountId: '0x01',
          chainId: 'polkadot',
          assetId: 0,
          free: 1000,
          reserved: 200,
          frozen: 600,
          locks: [makeLock(LockTypes.VESTING, 600)],
          mode: 'holdAndFreezes',
        }),
      ]);

      expect(result?.types.vested.fiat).toEqual('400');
      expect(result?.vestedOverlap.fiat).toEqual('200');
      expect(result?.vestedTotalFiat).toEqual('600');
    });

    test('counts overlapping vesting on an unpriced chain as a token entry', () => {
      const result = computeBalanceAllocation({
        accountIds: ['0x01'],
        balanceMap: {
          a: makeBalance({
            accountId: '0x01',
            chainId: 'westend',
            assetId: 0,
            free: 200,
            reserved: 800,
            frozen: 100,
            locks: [makeLock(LockTypes.VESTING, 100)],
            mode: 'holdAndFreezes',
          }),
        },
        chains: { westend: makeChain('westend', [makeAsset(0)]) },
        prices: PRICES,
        currency: CURRENCY,
      });

      expect(result?.unpricedVested).toHaveLength(1);
      expect(result?.unpricedVested[0]?.tokens.toNumber()).toEqual(100);
    });

    test('reports no overlap for a wallet whose vesting bites into free', () => {
      const result = compute([
        makeBalance({
          accountId: '0x01',
          chainId: 'polkadot',
          assetId: 0,
          free: 1000,
          frozen: 600,
          locks: [makeLock(LockTypes.VESTING, 600)],
        }),
      ]);

      expect(result?.types.vested.fiat).toEqual('600');
      expect(result?.vestedOverlap.fiat).toEqual('0');
      expect(result?.vestedOverlap.pct).toEqual(0);
    });
  });
});
