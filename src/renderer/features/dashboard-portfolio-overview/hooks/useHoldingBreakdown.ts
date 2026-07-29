import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Balance, type Chain } from '@/shared/core';
import { getRoundedValue, totalAmountBN } from '@/shared/lib/utils';
import { type PriceObject, useAssetsPrices } from '@/domains/price';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { currencySelect } from '@/aggregates/currency-select';
import { type BalanceType, splitBalanceForHoldings } from '../lib/balanceTypes';

export type BreakdownRow = {
  accountId: string;
  name: string;
  address: string;
  rawAmount: string;
  rawAmountNum: number;
  fiatValue: string;
  fiatValueNum: number;
  sharePercent: number;
  precision: number;
  symbol: string;
  colorIndex: number;
};

export type BreakdownData = {
  rows: BreakdownRow[];
};

type EntryLike = { accountId: string; name: string; address: string };

type HoldingBreakdownParams = {
  priceId: string;
  accountIds: string[];
  allEntries: EntryLike[];
  balanceType: BalanceType | null;
  balanceMap: Record<string, Balance>;
  chains: Record<string, Chain>;
  prices: PriceObject;
  currency: { coingeckoId: string };
};

/**
 * Pure computation behind {@link useHoldingBreakdown}. Split out from the hook
 * so the per-address grouping and balance-type scoping are testable without a
 * store/React harness.
 */
export function computeHoldingBreakdown(params: HoldingBreakdownParams): BreakdownData {
  const { priceId, accountIds, allEntries, balanceType, balanceMap, chains, prices, currency } = params;

  const accountIdSet = new Set(accountIds);

  const entryMap = new Map<string, { name: string; address: string }>();
  for (const entry of allEntries) {
    entryMap.set(entry.accountId, { name: entry.name, address: entry.address });
  }

  const groupMap = new Map<
    string,
    {
      totalRaw: BigNumber;
      fiatValue: BigNumber;
      precision: number;
      symbol: string;
    }
  >();

  for (const balance of Object.values(balanceMap)) {
    if (!accountIdSet.has(balance.accountId)) continue;

    const chain = chains[balance.chainId];
    if (!chain) continue;

    const asset = chain.assets.find((a) => a.assetId === balance.assetId);
    if (!asset?.priceId || asset.priceId !== priceId) continue;

    const priceItem = prices[asset.priceId]?.[currency.coingeckoId];
    if (!priceItem) continue;

    // Same buckets the holdings list is filtered by, so the accounts shown
    // here are exactly the ones contributing to the scoped list row.
    const rawBN = balanceType ? splitBalanceForHoldings(balance)[balanceType] : totalAmountBN(balance);
    const fiat = getRoundedValue(rawBN.toString(), priceItem.price, asset.precision);

    const existing = groupMap.get(balance.accountId);
    if (existing) {
      existing.totalRaw = existing.totalRaw.plus(rawBN.toString());
      existing.fiatValue = existing.fiatValue.plus(fiat);
    } else {
      groupMap.set(balance.accountId, {
        totalRaw: new BigNumber(rawBN.toString()),
        fiatValue: new BigNumber(fiat),
        precision: asset.precision,
        symbol: asset.symbol,
      });
    }
  }

  let totalFiat = new BigNumber(0);
  for (const group of groupMap.values()) {
    totalFiat = totalFiat.plus(group.fiatValue);
  }

  const rows: BreakdownRow[] = Array.from(groupMap.entries())
    .filter(([, g]) => g.totalRaw.gt(0))
    .map(([accountId, group]) => {
      const entry = entryMap.get(accountId);
      const fiatNum = group.fiatValue.toNumber();
      const share = totalFiat.gt(0) ? group.fiatValue.div(totalFiat).times(100).toNumber() : 0;

      return {
        accountId,
        name: entry?.name ?? '',
        address: entry?.address ?? '',
        rawAmount: group.totalRaw.toFixed(0),
        rawAmountNum: group.totalRaw.toNumber(),
        fiatValue: group.fiatValue.toString(),
        fiatValueNum: fiatNum,
        sharePercent: share,
        precision: group.precision,
        symbol: group.symbol,
        colorIndex: 0,
      };
    })
    .sort((a, b) => b.fiatValueNum - a.fiatValueNum);

  for (let i = 0; i < rows.length; i++) {
    rows[i]!.colorIndex = i;
  }

  return { rows };
}

export const useHoldingBreakdown = (
  priceId: string,
  accountIds: string[],
  allEntries: EntryLike[],
  balanceType: BalanceType | null,
): BreakdownData => {
  const balanceMap = useUnit(balanceModel.$balanceMap);
  const chains = useUnit(networkModel.$chains);
  const currency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);

  return useMemo(() => {
    if (!prices || !currency) return { rows: [] };

    return computeHoldingBreakdown({
      priceId,
      accountIds,
      allEntries,
      balanceType,
      balanceMap,
      chains,
      prices,
      currency,
    });
  }, [priceId, accountIds, balanceMap, chains, prices, currency, allEntries, balanceType]);
};
