import { BN } from '@polkadot/util';

import { computeAssetRowAllocations, computeChainRowAllocations } from '../computeRowAllocations';

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
  locked: overrides.vestingLock ? [{ type: '0x76657374696e6720', amount: makeBN(overrides.vestingLock) }] : [],
});

const makeChains = (
  assets: { chainId: string; assetId: number; priceId: string; symbol: string; precision: number }[],
) => {
  const chains: Record<
    string,
    {
      assets: {
        assetId: number;
        priceId: string;
        symbol: string;
        precision: number;
        name: string;
        icon: { monochrome: string; colored: string };
      }[];
    }
  > = {};
  for (const a of assets) {
    if (!chains[a.chainId]) {
      chains[a.chainId] = { assets: [] };
    }
    chains[a.chainId]!.assets.push({
      assetId: a.assetId,
      priceId: a.priceId,
      symbol: a.symbol,
      precision: a.precision,
      name: a.symbol,
      icon: { monochrome: '', colored: '' },
    });
  }

  return chains;
};

const makePrices = (entries: { priceId: string; coingeckoId: string; price: number }[]) => {
  const prices: Record<string, Record<string, { price: number; change: number }>> = {};
  for (const e of entries) {
    if (!prices[e.priceId]) prices[e.priceId] = {};
    prices[e.priceId]![e.coingeckoId] = { price: e.price, change: 0 };
  }

  return prices;
};

const makeCurrency = (coingeckoId = 'usd') => ({
  id: 1,
  code: 'USD',
  name: 'US Dollar',
  category: 'fiat' as const,
  popular: true,
  coingeckoId,
});

// --- tests ---

describe('computeAssetRowAllocations', () => {
  test('returns allocation segments for a single account with mixed balances', () => {
    // free=1000, reserved=200, frozen=300 (holdAndFreezes)
    // transferable = free - max(0, frozen - reserved) = 1000 - max(0, 300-200) = 1000 - 100 = 900
    // locked = total - transferable - reserved = 1200 - 900 - 200 = 100
    const balances = [
      makeBalance({ accountId: 'acc1', chainId: 'chain1', assetId: 0, free: 1000, reserved: 200, frozen: 300 }),
    ];
    const balanceMap = Object.fromEntries(balances.map((b) => [b.id, b]));

    const chains = makeChains([{ chainId: 'chain1', assetId: 0, priceId: 'polkadot', symbol: 'DOT', precision: 0 }]);
    const prices = makePrices([{ priceId: 'polkadot', coingeckoId: 'usd', price: 1 }]);
    const currency = makeCurrency();

    const result = computeAssetRowAllocations({
      accountIds: ['acc1'],
      priceId: 'polkadot',
      balanceMap: balanceMap as any,
      chains: chains as any,
      prices,
      currency,
    });

    expect(result.size).toBe(1);
    const alloc = result.get('acc1')!;
    expect(alloc.transferable.pct).toBeCloseTo(75, 0); // 900/1200 * 100
    expect(alloc.transferable.raw).toBe('900');
    expect(alloc.reserved.pct).toBeCloseTo(16.67, 0); // 200/1200 * 100
    expect(alloc.reserved.fiat).toBe('200');
    expect(alloc.locked.pct).toBeCloseTo(8.33, 0); // 100/1200 * 100
    expect(alloc.vested.pct).toBe(0);
  });

  test('carves the vesting lock out of the locked amount', () => {
    // transferable = 1000 - max(0, 400-0) = 600, locked total = 1000 - 600 = 400
    // vested = min(vestingLock=300, 400) = 300, locked = 100
    const balances = [
      makeBalance({
        accountId: 'acc1',
        chainId: 'chain1',
        assetId: 0,
        free: 1000,
        reserved: 0,
        frozen: 400,
        vestingLock: 300,
      }),
    ];
    const balanceMap = Object.fromEntries(balances.map((b) => [b.id, b]));
    const chains = makeChains([{ chainId: 'chain1', assetId: 0, priceId: 'polkadot', symbol: 'DOT', precision: 0 }]);
    const prices = makePrices([{ priceId: 'polkadot', coingeckoId: 'usd', price: 1 }]);

    const result = computeAssetRowAllocations({
      accountIds: ['acc1'],
      priceId: 'polkadot',
      balanceMap: balanceMap as any,
      chains: chains as any,
      prices,
      currency: makeCurrency(),
    });

    const alloc = result.get('acc1')!;
    expect(alloc.vested.raw).toBe('300');
    expect(alloc.vested.fiat).toBe('300');
    expect(alloc.vested.pct).toBeCloseTo(30, 0);
    expect(alloc.locked.raw).toBe('100');
    expect(alloc.locked.pct).toBeCloseTo(10, 0);
  });

  test('caps vested by the locked amount', () => {
    // locked total = 100, vesting lock claims 500 -> vested = 100, locked = 0
    const balances = [
      makeBalance({
        accountId: 'acc1',
        chainId: 'chain1',
        assetId: 0,
        free: 1000,
        reserved: 0,
        frozen: 100,
        vestingLock: 500,
      }),
    ];
    const balanceMap = Object.fromEntries(balances.map((b) => [b.id, b]));
    const chains = makeChains([{ chainId: 'chain1', assetId: 0, priceId: 'polkadot', symbol: 'DOT', precision: 0 }]);
    const prices = makePrices([{ priceId: 'polkadot', coingeckoId: 'usd', price: 1 }]);

    const result = computeAssetRowAllocations({
      accountIds: ['acc1'],
      priceId: 'polkadot',
      balanceMap: balanceMap as any,
      chains: chains as any,
      prices,
      currency: makeCurrency(),
    });

    const alloc = result.get('acc1')!;
    expect(alloc.vested.raw).toBe('100');
    expect(alloc.locked.raw).toBe('0');
    expect(alloc.locked.pct).toBe(0);
  });

  test('returns 100% transferable when no locks or reserves', () => {
    const balances = [
      makeBalance({ accountId: 'acc1', chainId: 'chain1', assetId: 0, free: 500, reserved: 0, frozen: 0 }),
    ];
    const balanceMap = Object.fromEntries(balances.map((b) => [b.id, b]));
    const chains = makeChains([{ chainId: 'chain1', assetId: 0, priceId: 'polkadot', symbol: 'DOT', precision: 0 }]);
    const prices = makePrices([{ priceId: 'polkadot', coingeckoId: 'usd', price: 1 }]);

    const result = computeAssetRowAllocations({
      accountIds: ['acc1'],
      priceId: 'polkadot',
      balanceMap: balanceMap as any,
      chains: chains as any,
      prices,
      currency: makeCurrency(),
    });

    const alloc = result.get('acc1')!;
    expect(alloc.transferable.pct).toBeCloseTo(100, 0);
    expect(alloc.locked.pct).toBe(0);
    expect(alloc.reserved.pct).toBe(0);
    expect(alloc.vested.pct).toBe(0);
  });

  test('omits accounts with zero balance from result', () => {
    const balances = [
      makeBalance({ accountId: 'acc1', chainId: 'chain1', assetId: 0, free: 0, reserved: 0, frozen: 0 }),
    ];
    const balanceMap = Object.fromEntries(balances.map((b) => [b.id, b]));
    const chains = makeChains([{ chainId: 'chain1', assetId: 0, priceId: 'polkadot', symbol: 'DOT', precision: 0 }]);
    const prices = makePrices([{ priceId: 'polkadot', coingeckoId: 'usd', price: 1 }]);

    const result = computeAssetRowAllocations({
      accountIds: ['acc1'],
      priceId: 'polkadot',
      balanceMap: balanceMap as any,
      chains: chains as any,
      prices,
      currency: makeCurrency(),
    });

    expect(result.size).toBe(0);
  });

  test('aggregates balances across multiple chains for same priceId', () => {
    // acc1 holds DOT on chain1 and chain2
    const balances = [
      makeBalance({ accountId: 'acc1', chainId: 'chain1', assetId: 0, free: 600, reserved: 100, frozen: 200 }),
      makeBalance({ accountId: 'acc1', chainId: 'chain2', assetId: 0, free: 400, reserved: 0, frozen: 0 }),
    ];
    const balanceMap = Object.fromEntries(balances.map((b) => [b.id, b]));
    const chains = makeChains([
      { chainId: 'chain1', assetId: 0, priceId: 'polkadot', symbol: 'DOT', precision: 0 },
      { chainId: 'chain2', assetId: 0, priceId: 'polkadot', symbol: 'DOT', precision: 0 },
    ]);
    const prices = makePrices([{ priceId: 'polkadot', coingeckoId: 'usd', price: 1 }]);

    const result = computeAssetRowAllocations({
      accountIds: ['acc1'],
      priceId: 'polkadot',
      balanceMap: balanceMap as any,
      chains: chains as any,
      prices,
      currency: makeCurrency(),
    });

    // chain1: transferable = 600 - max(0, 200-100) = 500, reserved = 100, total = 700
    // chain2: transferable = 400, reserved = 0, total = 400
    // combined: transferable = 900, reserved = 100, total = 1100, locked = 100
    const alloc = result.get('acc1')!;
    expect(alloc.transferable.pct).toBeCloseTo(81.8, 0);
    expect(alloc.transferable.raw).toBe('900');
    expect(alloc.reserved.pct).toBeCloseTo(9.1, 0);
    expect(alloc.locked.pct).toBeCloseTo(9.1, 0);
  });
});

describe('computeChainRowAllocations', () => {
  test('returns allocation per asset on a chain across accounts', () => {
    const balances = [
      makeBalance({ accountId: 'acc1', chainId: 'chain1', assetId: 0, free: 1000, reserved: 200, frozen: 300 }),
      makeBalance({ accountId: 'acc2', chainId: 'chain1', assetId: 0, free: 500, reserved: 0, frozen: 0 }),
    ];
    const balanceMap = Object.fromEntries(balances.map((b) => [b.id, b]));
    const chains = makeChains([{ chainId: 'chain1', assetId: 0, priceId: 'polkadot', symbol: 'DOT', precision: 0 }]);
    const prices = makePrices([{ priceId: 'polkadot', coingeckoId: 'usd', price: 1 }]);

    const result = computeChainRowAllocations({
      assetIds: [0],
      chainId: 'chain1' as any,
      accountIds: ['acc1', 'acc2'],
      balanceMap: balanceMap as any,
      chains: chains as any,
      prices,
      currency: makeCurrency(),
    });

    // acc1: transferable=900, reserved=200, total=1200
    // acc2: transferable=500, reserved=0, total=500
    // combined: transferable=1400, reserved=200, total=1700, locked=100
    const alloc = result.get(0)!;
    expect(alloc.transferable.pct).toBeCloseTo(82.4, 0);
    expect(alloc.reserved.pct).toBeCloseTo(11.8, 0);
    expect(alloc.locked.pct).toBeCloseTo(5.9, 0);
  });

  test('carves the vesting lock out of the locked amount', () => {
    // transferable = 1000 - max(0, 400-0) = 600, locked total = 1000 - 600 = 400
    // vested = min(vestingLock=300, 400) = 300, locked = 100
    const balances = [
      makeBalance({
        accountId: 'acc1',
        chainId: 'chain1',
        assetId: 0,
        free: 1000,
        reserved: 0,
        frozen: 400,
        vestingLock: 300,
      }),
    ];
    const balanceMap = Object.fromEntries(balances.map((b) => [b.id, b]));
    const chains = makeChains([{ chainId: 'chain1', assetId: 0, priceId: 'polkadot', symbol: 'DOT', precision: 0 }]);
    const prices = makePrices([{ priceId: 'polkadot', coingeckoId: 'usd', price: 1 }]);

    const result = computeChainRowAllocations({
      assetIds: [0],
      chainId: 'chain1' as any,
      accountIds: ['acc1'],
      balanceMap: balanceMap as any,
      chains: chains as any,
      prices,
      currency: makeCurrency(),
    });

    const alloc = result.get(0)!;
    expect(alloc.vested).toEqual({ pct: 30, raw: '300', fiat: '300' });
    expect(alloc.locked).toEqual({ pct: 10, raw: '100', fiat: '100' });
    expect(alloc.transferable).toEqual({ pct: 60, raw: '600', fiat: '600' });
    expect(alloc.reserved.pct).toBe(0);
  });

  test('omits assets with zero balance', () => {
    const balances = [
      makeBalance({ accountId: 'acc1', chainId: 'chain1', assetId: 5, free: 0, reserved: 0, frozen: 0 }),
    ];
    const balanceMap = Object.fromEntries(balances.map((b) => [b.id, b]));
    const chains = makeChains([{ chainId: 'chain1', assetId: 5, priceId: 'usdt', symbol: 'USDT', precision: 6 }]);
    const prices = makePrices([{ priceId: 'usdt', coingeckoId: 'usd', price: 1 }]);

    const result = computeChainRowAllocations({
      assetIds: [5],
      chainId: 'chain1' as any,
      accountIds: ['acc1'],
      balanceMap: balanceMap as any,
      chains: chains as any,
      prices,
      currency: makeCurrency(),
    });

    expect(result.size).toBe(0);
  });
});
