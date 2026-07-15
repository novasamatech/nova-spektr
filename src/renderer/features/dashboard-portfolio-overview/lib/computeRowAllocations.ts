import { default as BigNumber } from 'bignumber.js';

import { type Balance, type Chain, type ChainId } from '@/shared/core';
import { getRoundedValue } from '@/shared/lib/utils';

import { type BalanceType, BALANCE_TYPES, makeByType, splitBalanceByType } from './balanceTypes';

export type AllocationSegment = {
  pct: number;
  raw: string;
  fiat: string;
};

export type RowAllocation = Record<BalanceType, AllocationSegment>;

type PriceMap = Record<string, Record<string, { price: number; change: number }>>;

type AssetAllocParams = {
  accountIds: string[];
  priceId: string;
  balanceMap: Record<string, Balance>;
  chains: Record<string, Chain>;
  prices: PriceMap;
  currency: { coingeckoId: string };
};

type ChainAllocParams = {
  assetIds: number[];
  chainId: ChainId;
  accountIds: string[];
  balanceMap: Record<string, Balance>;
  chains: Record<string, Chain>;
  prices: PriceMap;
  currency: { coingeckoId: string };
};

type ByTypeAccumulator = Record<BalanceType, { raw: BigNumber; fiat: BigNumber }>;

const makeAccumulator = (): ByTypeAccumulator => makeByType(() => ({ raw: new BigNumber(0), fiat: new BigNumber(0) }));

function accumulate(acc: ByTypeAccumulator, balance: Balance, price: number, precision: number) {
  const split = splitBalanceByType(balance);
  for (const type of BALANCE_TYPES) {
    if (split[type].isZero()) continue;

    const raw = split[type].toString();
    acc[type].raw = acc[type].raw.plus(raw);
    acc[type].fiat = acc[type].fiat.plus(getRoundedValue(raw, price, precision));
  }
}

function toAllocation(acc: ByTypeAccumulator): RowAllocation | null {
  let totalFiat = new BigNumber(0);
  for (const type of BALANCE_TYPES) {
    totalFiat = totalFiat.plus(acc[type].fiat);
  }
  if (totalFiat.isZero()) return null;

  return makeByType((type) => ({
    pct: acc[type].fiat.div(totalFiat).multipliedBy(100).toNumber(),
    raw: acc[type].raw.toFixed(0),
    fiat: acc[type].fiat.toString(),
  }));
}

export function computeAssetRowAllocations(params: AssetAllocParams): Map<string, RowAllocation> {
  const { accountIds, priceId, balanceMap, chains, prices, currency } = params;
  const result = new Map<string, RowAllocation>();

  const accountIdSet = new Set(accountIds);

  // Group balances by accountId, filtering to matching priceId
  const grouped = new Map<string, ByTypeAccumulator>();

  for (const balance of Object.values(balanceMap)) {
    if (!accountIdSet.has(balance.accountId)) continue;

    const chain = chains[balance.chainId];
    if (!chain) continue;

    const asset = chain.assets.find((a) => a.assetId === balance.assetId);
    if (!asset?.priceId || asset.priceId !== priceId) continue;

    const priceItem = prices[asset.priceId]?.[currency.coingeckoId];
    if (!priceItem) continue;

    let acc = grouped.get(balance.accountId);
    if (!acc) {
      acc = makeAccumulator();
      grouped.set(balance.accountId, acc);
    }
    accumulate(acc, balance, priceItem.price, asset.precision);
  }

  for (const [accountId, acc] of grouped) {
    const alloc = toAllocation(acc);
    if (alloc) result.set(accountId, alloc);
  }

  return result;
}

export function computeChainRowAllocations(params: ChainAllocParams): Map<number, RowAllocation> {
  const { assetIds, chainId, accountIds, balanceMap, chains, prices, currency } = params;
  const result = new Map<number, RowAllocation>();

  const accountIdSet = new Set(accountIds);
  const assetIdSet = new Set(assetIds);
  const chain = chains[chainId];
  if (!chain) return result;

  const grouped = new Map<number, ByTypeAccumulator>();

  for (const balance of Object.values(balanceMap)) {
    if (!accountIdSet.has(balance.accountId)) continue;
    if (balance.chainId !== chainId) continue;
    if (!assetIdSet.has(balance.assetId)) continue;

    const asset = chain.assets.find((a) => a.assetId === balance.assetId);
    if (!asset?.priceId) continue;

    const priceItem = prices[asset.priceId]?.[currency.coingeckoId];
    if (!priceItem) continue;

    let acc = grouped.get(balance.assetId);
    if (!acc) {
      acc = makeAccumulator();
      grouped.set(balance.assetId, acc);
    }
    accumulate(acc, balance, priceItem.price, asset.precision);
  }

  for (const [assetId, acc] of grouped) {
    const alloc = toAllocation(acc);
    if (alloc) result.set(assetId, alloc);
  }

  return result;
}
