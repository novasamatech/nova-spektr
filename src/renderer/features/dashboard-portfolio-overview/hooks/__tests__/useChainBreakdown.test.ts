import { BN } from '@polkadot/util';

import { type Asset, type Balance, type Chain, type ChainId } from '@/shared/core';
import { type PriceObject } from '@/domains/price';
import { computeChainBreakdown } from '../useChainBreakdown';

const CURRENCY = { coingeckoId: 'usd' };

const makeBalance = (params: {
  accountId: string;
  chainId: string;
  assetId: number;
  free: number;
  reserved?: number;
  frozen?: number;
}): Balance => {
  // structural balance fixture, matching the fields computeChainBreakdown +
  // splitBalanceForHoldings read (legacy transferable mode)
  const balance = {
    accountId: params.accountId,
    chainId: params.chainId,
    assetId: params.assetId,
    free: new BN(params.free),
    reserved: new BN(params.reserved ?? 0),
    frozen: new BN(params.frozen ?? 0),
    locked: [],
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

// both assets priced at 1 unit / token so fiat === raw tokens
const PRICES: PriceObject = { dot: { usd: { price: 1, change: 0 } }, usdt: { usd: { price: 1, change: 0 } } };
const CHAIN_ID = 'polkadot' as ChainId;
const CHAINS = { polkadot: makeChain('polkadot', [makeAsset(1, 'dot'), makeAsset(2, 'usdt')]) };

const compute = (balances: Balance[], balanceType: Parameters<typeof computeChainBreakdown>[0]['balanceType']) =>
  computeChainBreakdown({
    chainId: CHAIN_ID,
    accountIds: ['a'],
    balanceType,
    balanceMap: Object.fromEntries(balances.map((b, i) => [String(i), b])),
    chains: CHAINS,
    prices: PRICES,
    currency: CURRENCY,
  });

describe('computeChainBreakdown', () => {
  test('without a filter rows carry full totals per asset', () => {
    const result = compute(
      [
        makeBalance({ accountId: 'a', chainId: 'polkadot', assetId: 1, free: 600, reserved: 200 }),
        makeBalance({ accountId: 'a', chainId: 'polkadot', assetId: 2, free: 200 }),
      ],
      null,
    );

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ assetId: 1, rawAmount: '800', sharePercent: 80 });
    expect(result.rows[1]).toMatchObject({ assetId: 2, rawAmount: '200', sharePercent: 20 });
  });

  test('drops assets holding none of the filtered balance type and re-scopes amounts', () => {
    const result = compute(
      [
        makeBalance({ accountId: 'a', chainId: 'polkadot', assetId: 1, free: 600, reserved: 200 }),
        // asset 2 has nothing reserved
        makeBalance({ accountId: 'a', chainId: 'polkadot', assetId: 2, free: 900 }),
      ],
      'reserved',
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ assetId: 1, rawAmount: '200', sharePercent: 100 });
  });
});
