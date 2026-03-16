import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { getRoundedValue } from '@/shared/lib/utils';
import { currencyModel, useAssetsPrices } from '@/domains/price';
import { type StakingMap } from '@/domains/staking';

import { type ChainStakingSummary } from './useStakingOverview';

export type StakingBreakdownRow = {
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

export type EntryLike = { accountId: string; name: string; address: string };

type Params = {
  stakingData: StakingMap;
  chainSummary: ChainStakingSummary;
  accountIds: string[];
  allEntries: EntryLike[];
};

export const useStakingBreakdown = ({ stakingData, chainSummary, accountIds, allEntries }: Params) => {
  const currency = useUnit(currencyModel.$activeCurrency);
  const { data: prices } = useAssetsPrices(currency?.coingeckoId ?? null);

  return useMemo(() => {
    if (!prices || !currency) return { rows: [] };

    const entryMap = new Map<string, { name: string; address: string }>();
    for (const entry of allEntries) {
      entryMap.set(entry.accountId, { name: entry.name, address: entry.address });
    }

    const priceItem = prices[chainSummary.priceId]?.[currency.coingeckoId];
    const accountIdSet = new Set(accountIds);

    const rawRows: StakingBreakdownRow[] = [];
    let totalFiat = new BigNumber(0);

    for (const [accountId, stake] of Object.entries(stakingData)) {
      if (!accountIdSet.has(accountId) || !stake) continue;

      const totalBN = new BigNumber(stake.total);
      if (totalBN.isZero()) continue;

      const fiat = priceItem
        ? new BigNumber(getRoundedValue(stake.total, priceItem.price, chainSummary.precision))
        : new BigNumber(0);

      totalFiat = totalFiat.plus(fiat);

      const entry = entryMap.get(accountId);
      rawRows.push({
        accountId,
        name: entry?.name ?? '',
        address: entry?.address ?? '',
        rawAmount: stake.total,
        rawAmountNum: totalBN.toNumber(),
        fiatValue: fiat.toString(),
        fiatValueNum: fiat.toNumber(),
        sharePercent: 0,
        precision: chainSummary.precision,
        symbol: chainSummary.symbol,
        colorIndex: 0,
      });
    }

    rawRows.sort((a, b) => b.fiatValueNum - a.fiatValueNum);

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i]!;
      row.colorIndex = i;
      row.sharePercent = totalFiat.gt(0)
        ? Math.round(new BigNumber(row.fiatValue).div(totalFiat).times(1000).toNumber()) / 10
        : 0;
    }

    return { rows: rawRows };
  }, [stakingData, chainSummary, accountIds, allEntries, prices, currency]);
};
