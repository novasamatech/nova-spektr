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
    transferableMode: 'legacy',
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
});
