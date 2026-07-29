import { BN } from '@polkadot/util';

import { type Asset, type Balance, type Chain, LockTypes } from '@/shared/core';
import { type PriceObject } from '@/domains/price';
import { computeHoldingBreakdown } from '../useHoldingBreakdown';

type AssetLock = Balance['locked'][number];

const CURRENCY = { coingeckoId: 'usd' };

const makeLock = (type: LockTypes, amount: number): AssetLock => ({ type, amount: new BN(amount) });

const makeBalance = (params: {
  accountId: string;
  chainId: string;
  assetId: number;
  free: number;
  reserved?: number;
  frozen?: number;
  locks?: AssetLock[];
  mode?: 'legacy' | 'holdAndFreezes';
}): Balance => {
  // structural balance fixture, matching the fields computeHoldingBreakdown +
  // splitBalanceForHoldings read
  const balance = {
    accountId: params.accountId,
    chainId: params.chainId,
    assetId: params.assetId,
    free: new BN(params.free),
    reserved: new BN(params.reserved ?? 0),
    frozen: new BN(params.frozen ?? 0),
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

// a single priced asset priced at 1 unit / token so fiat === raw tokens
const PRICES: PriceObject = { dot: { usd: { price: 1, change: 0 } } };
const CHAINS = { polkadot: makeChain('polkadot', [makeAsset(1, 'dot')]) };
const ENTRIES = [
  { accountId: 'a', name: 'Alice', address: 'addrA' },
  { accountId: 'b', name: 'Bob', address: 'addrB' },
];

const compute = (balances: Balance[], balanceType: Parameters<typeof computeHoldingBreakdown>[0]['balanceType']) =>
  computeHoldingBreakdown({
    priceId: 'dot',
    accountIds: ['a', 'b'],
    allEntries: ENTRIES,
    balanceType,
    balanceMap: Object.fromEntries(balances.map((b, i) => [String(i), b])),
    chains: CHAINS,
    prices: PRICES,
    currency: CURRENCY,
  });

describe('computeHoldingBreakdown', () => {
  test('without a filter rows carry full totals and shares of the grand total', () => {
    const result = compute(
      [
        makeBalance({ accountId: 'a', chainId: 'polkadot', assetId: 1, free: 600, reserved: 200 }),
        makeBalance({ accountId: 'b', chainId: 'polkadot', assetId: 1, free: 200 }),
      ],
      null,
    );

    expect(result.rows).toHaveLength(2);
    // sorted by fiat desc, names resolved from entries
    expect(result.rows[0]).toMatchObject({ accountId: 'a', name: 'Alice', rawAmount: '800', sharePercent: 80 });
    expect(result.rows[1]).toMatchObject({ accountId: 'b', name: 'Bob', rawAmount: '200', sharePercent: 20 });
  });

  test('drops accounts holding none of the filtered balance type', () => {
    const result = compute(
      [
        makeBalance({ accountId: 'a', chainId: 'polkadot', assetId: 1, free: 600, reserved: 200 }),
        // b holds plenty, but nothing reserved
        makeBalance({ accountId: 'b', chainId: 'polkadot', assetId: 1, free: 900 }),
      ],
      'reserved',
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ accountId: 'a', rawAmount: '200', sharePercent: 100 });
  });

  test('recomputes shares against the scoped sum, not the full totals', () => {
    // transferable (legacy) = free − frozen: a → 400, b → 600
    const result = compute(
      [
        makeBalance({ accountId: 'a', chainId: 'polkadot', assetId: 1, free: 1000, frozen: 600 }),
        makeBalance({ accountId: 'b', chainId: 'polkadot', assetId: 1, free: 600 }),
      ],
      'transferable',
    );

    expect(result.rows).toHaveLength(2);
    // b leads under the filter even though a's full balance is larger
    expect(result.rows[0]).toMatchObject({ accountId: 'b', rawAmount: '600', sharePercent: 60 });
    expect(result.rows[1]).toMatchObject({ accountId: 'a', rawAmount: '400', sharePercent: 40 });
  });

  test('vested filter counts a lock riding on reserved funds', () => {
    // holdAndFreezes staker: the 100 vesting lock is fully covered by the 800
    // held, so the partition reports zero vested — but the holdings buckets
    // (splitBalanceForHoldings) must still select this account under Vested.
    const result = compute(
      [
        makeBalance({
          accountId: 'a',
          chainId: 'polkadot',
          assetId: 1,
          free: 200,
          reserved: 800,
          frozen: 100,
          locks: [makeLock(LockTypes.VESTING, 100)],
          mode: 'holdAndFreezes',
        }),
      ],
      'vested',
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ accountId: 'a', rawAmount: '100' });
  });
});
