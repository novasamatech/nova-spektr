import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { getRoundedValue } from '@/shared/lib/utils';
import { currencyModel, priceProviderModel, useAssetsPrices } from '@/domains/price';
import { type RewardsMap } from '@/domains/staking';

import { type EntryLike } from './useStakingBreakdown';
import { type ChainRewardsSummary } from './useTotalRewards';

export type RewardsBreakdownRow = {
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

type Params = {
  rewardsMap: RewardsMap;
  chainSummary: ChainRewardsSummary;
  accountIds: string[];
  allEntries: EntryLike[];
};

export const useRewardsBreakdown = ({ rewardsMap, chainSummary, accountIds, allEntries }: Params) => {
  const currency = useUnit(currencyModel.$activeCurrency);
  const pricesParams = useUnit(priceProviderModel.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);

  return useMemo(() => {
    if (!prices || !currency) return { rows: [] };

    const entryMap = new Map<string, { name: string; address: string }>();
    for (const entry of allEntries) {
      entryMap.set(entry.accountId, { name: entry.name, address: entry.address });
    }

    const priceItem = prices[chainSummary.priceId]?.[currency.coingeckoId];
    const accountIdSet = new Set(accountIds);

    const rawRows: RewardsBreakdownRow[] = [];
    let totalFiat = new BigNumber(0);

    for (const [accountId, reward] of Object.entries(rewardsMap)) {
      if (!accountIdSet.has(accountId) || !reward) continue;

      const rewardBN = new BigNumber(reward);
      if (rewardBN.isZero()) continue;

      const fiat = priceItem
        ? new BigNumber(getRoundedValue(reward, priceItem.price, chainSummary.precision))
        : new BigNumber(0);

      totalFiat = totalFiat.plus(fiat);

      const entry = entryMap.get(accountId);
      rawRows.push({
        accountId,
        name: entry?.name ?? '',
        address: entry?.address ?? '',
        rawAmount: reward,
        rawAmountNum: rewardBN.toNumber(),
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
  }, [rewardsMap, chainSummary, accountIds, allEntries, prices, currency]);
};
