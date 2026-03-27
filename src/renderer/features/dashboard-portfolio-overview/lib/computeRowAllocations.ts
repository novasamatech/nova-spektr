import { default as BigNumber } from 'bignumber.js';

import { type ChainId } from '@/shared/core';
import { getRoundedValue, transferableAmountBN } from '@/shared/lib/utils';
import { type ChainAssetRow } from '../hooks/useChainBreakdown';
import { type BreakdownRow } from '../hooks/useHoldingBreakdown';

export type RowAllocation = {
  transferablePct: number;
  lockedPct: number;
  reservedPct: number;
};

type PriceMap = Record<string, Record<string, { price: number; change: number }>>;

type AssetAllocParams = {
  rows: BreakdownRow[];
  priceId: string;
  balanceMap: Record<string, any>;
  chains: Record<string, any>;
  prices: PriceMap;
  currency: { coingeckoId: string };
};

type ChainAllocParams = {
  rows: ChainAssetRow[];
  chainId: ChainId;
  accountIds: string[];
  balanceMap: Record<string, any>;
  chains: Record<string, any>;
  prices: PriceMap;
  currency: { coingeckoId: string };
};

function toAllocation(
  transferableTotal: BigNumber,
  reservedTotal: BigNumber,
  grandTotal: BigNumber,
): RowAllocation | null {
  if (grandTotal.isZero()) return null;

  const lockedFiat = BigNumber.max(0, grandTotal.minus(transferableTotal).minus(reservedTotal));

  return {
    transferablePct: transferableTotal.div(grandTotal).multipliedBy(100).toNumber(),
    lockedPct: lockedFiat.div(grandTotal).multipliedBy(100).toNumber(),
    reservedPct: reservedTotal.div(grandTotal).multipliedBy(100).toNumber(),
  };
}

export function computeAssetRowAllocations(params: AssetAllocParams): Map<string, RowAllocation> {
  const { rows, priceId, balanceMap, chains, prices, currency } = params;
  const result = new Map<string, RowAllocation>();

  const accountIds = new Set(rows.map((r) => r.accountId));

  // Group balances by accountId, filtering to matching priceId
  const grouped = new Map<string, { transferable: BigNumber; reserved: BigNumber; total: BigNumber }>();

  for (const balance of Object.values(balanceMap)) {
    if (!accountIds.has(balance.accountId)) continue;

    const chain = chains[balance.chainId];
    if (!chain) continue;

    const asset = chain.assets.find((a: any) => a.assetId === balance.assetId);
    if (!asset?.priceId || asset.priceId !== priceId) continue;

    const priceItem = prices[asset.priceId]?.[currency.coingeckoId];
    if (!priceItem) continue;

    const transferableFiat = new BigNumber(
      getRoundedValue(transferableAmountBN(balance).toString(), priceItem.price, asset.precision),
    );
    const reservedFiat = new BigNumber(getRoundedValue(balance.reserved.toString(), priceItem.price, asset.precision));
    const totalFiat = new BigNumber(
      getRoundedValue(balance.free.add(balance.reserved).toString(), priceItem.price, asset.precision),
    );

    const existing = grouped.get(balance.accountId);
    if (existing) {
      existing.transferable = existing.transferable.plus(transferableFiat);
      existing.reserved = existing.reserved.plus(reservedFiat);
      existing.total = existing.total.plus(totalFiat);
    } else {
      grouped.set(balance.accountId, {
        transferable: transferableFiat,
        reserved: reservedFiat,
        total: totalFiat,
      });
    }
  }

  for (const [accountId, group] of grouped) {
    const alloc = toAllocation(group.transferable, group.reserved, group.total);
    if (alloc) result.set(accountId, alloc);
  }

  return result;
}

export function computeChainRowAllocations(params: ChainAllocParams): Map<number, RowAllocation> {
  const { rows, chainId, accountIds, balanceMap, chains, prices, currency } = params;
  const result = new Map<number, RowAllocation>();

  const accountIdSet = new Set(accountIds);
  const assetIds = new Set(rows.map((r) => r.assetId));
  const chain = chains[chainId];
  if (!chain) return result;

  const grouped = new Map<number, { transferable: BigNumber; reserved: BigNumber; total: BigNumber }>();

  for (const balance of Object.values(balanceMap)) {
    if (!accountIdSet.has(balance.accountId)) continue;
    if (balance.chainId !== chainId) continue;
    if (!assetIds.has(balance.assetId)) continue;

    const asset = chain.assets.find((a: any) => a.assetId === balance.assetId);
    if (!asset?.priceId) continue;

    const priceItem = prices[asset.priceId]?.[currency.coingeckoId];
    if (!priceItem) continue;

    const transferableFiat = new BigNumber(
      getRoundedValue(transferableAmountBN(balance).toString(), priceItem.price, asset.precision),
    );
    const reservedFiat = new BigNumber(getRoundedValue(balance.reserved.toString(), priceItem.price, asset.precision));
    const totalFiat = new BigNumber(
      getRoundedValue(balance.free.add(balance.reserved).toString(), priceItem.price, asset.precision),
    );

    const existing = grouped.get(balance.assetId);
    if (existing) {
      existing.transferable = existing.transferable.plus(transferableFiat);
      existing.reserved = existing.reserved.plus(reservedFiat);
      existing.total = existing.total.plus(totalFiat);
    } else {
      grouped.set(balance.assetId, {
        transferable: transferableFiat,
        reserved: reservedFiat,
        total: totalFiat,
      });
    }
  }

  for (const [assetId, group] of grouped) {
    const alloc = toAllocation(group.transferable, group.reserved, group.total);
    if (alloc) result.set(assetId, alloc);
  }

  return result;
}
