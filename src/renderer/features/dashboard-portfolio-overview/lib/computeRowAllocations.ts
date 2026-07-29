import { default as BigNumber } from 'bignumber.js';

import { type Balance, type Chain, type ChainId } from '@/shared/core';
import { getRoundedValue } from '@/shared/lib/utils';
import { type PriceObject } from '@/domains/price';

import { type BalanceType, BALANCE_TYPES, makeByType, splitBalanceByType, vestingOverlapBN } from './balanceTypes';

export type AllocationSegment = {
  pct: number;
  raw: string;
  fiat: string;
};

export type RowAllocation = {
  types: Record<BalanceType, AllocationSegment>;
  /**
   * Vesting that rides on reserved funds — see {@link vestingOverlapBN}. Same
   * contract as `AllocationData.vestedOverlap`: not one of `types` (those sum
   * to the row total and drive the bar's geometry), `pct` is expressed against
   * the same total so it can be drawn as a marker over the segments it covers.
   */
  vestedOverlap: AllocationSegment;
  /**
   * Everything under a vesting schedule — `types.vested` plus the overlap. What
   * the legend prints, so the figure matches the holdings row the Vested filter
   * selected.
   */
  vestedTotal: { raw: string; fiat: string };
};

type AssetAllocParams = {
  accountIds: string[];
  priceId: string;
  balanceMap: Record<string, Balance>;
  chains: Record<string, Chain>;
  prices: PriceObject;
  currency: { coingeckoId: string };
};

type ChainAllocParams = {
  assetIds: number[];
  chainId: ChainId;
  accountIds: string[];
  balanceMap: Record<string, Balance>;
  chains: Record<string, Chain>;
  prices: PriceObject;
  currency: { coingeckoId: string };
};

type Amounts = { raw: BigNumber; fiat: BigNumber };

type RowAccumulator = {
  types: Record<BalanceType, Amounts>;
  overlap: Amounts;
};

const makeAmounts = (): Amounts => ({ raw: new BigNumber(0), fiat: new BigNumber(0) });

const makeAccumulator = (): RowAccumulator => ({ types: makeByType(makeAmounts), overlap: makeAmounts() });

function addAmounts(amounts: Amounts, raw: string, price: number, precision: number) {
  amounts.raw = amounts.raw.plus(raw);
  amounts.fiat = amounts.fiat.plus(getRoundedValue(raw, price, precision));
}

function accumulate(acc: RowAccumulator, balance: Balance, price: number, precision: number) {
  const split = splitBalanceByType(balance);
  for (const type of BALANCE_TYPES) {
    if (split[type].isZero()) continue;

    addAmounts(acc.types[type], split[type].toString(), price, precision);
  }

  const overlap = vestingOverlapBN(balance);
  if (!overlap.isZero()) {
    addAmounts(acc.overlap, overlap.toString(), price, precision);
  }
}

function toAllocation(acc: RowAccumulator): RowAllocation | null {
  // The overlap stays out of the total: it doubles funds already counted under
  // `reserved`/`locked`, adding it would inflate every percentage.
  let totalFiat = new BigNumber(0);
  for (const type of BALANCE_TYPES) {
    totalFiat = totalFiat.plus(acc.types[type].fiat);
  }
  if (totalFiat.isZero()) return null;

  const toSegment = (amounts: Amounts): AllocationSegment => ({
    pct: amounts.fiat.div(totalFiat).multipliedBy(100).toNumber(),
    raw: amounts.raw.toFixed(0),
    fiat: amounts.fiat.toString(),
  });

  return {
    types: makeByType((type) => toSegment(acc.types[type])),
    vestedOverlap: toSegment(acc.overlap),
    vestedTotal: {
      raw: acc.types.vested.raw.plus(acc.overlap.raw).toFixed(0),
      fiat: acc.types.vested.fiat.plus(acc.overlap.fiat).toString(),
    },
  };
}

export function computeAssetRowAllocations(params: AssetAllocParams): Map<string, RowAllocation> {
  const { accountIds, priceId, balanceMap, chains, prices, currency } = params;
  const result = new Map<string, RowAllocation>();

  const accountIdSet = new Set(accountIds);

  // Group balances by accountId, filtering to matching priceId
  const grouped = new Map<string, RowAccumulator>();

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

  const grouped = new Map<number, RowAccumulator>();

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
