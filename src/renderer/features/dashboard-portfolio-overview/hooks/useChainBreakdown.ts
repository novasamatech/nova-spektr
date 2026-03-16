import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { getRoundedValue, totalAmount, totalAmountBN } from '@/shared/lib/utils';
import { currencyModel, priceProviderModel } from '@/domains/price';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';

export type ChainAssetRow = {
  assetId: number;
  priceId: string;
  symbol: string;
  name: string;
  icon: { monochrome: string; colored: string };
  precision: number;
  rawAmount: string;
  rawAmountNum: number;
  fiatValue: string;
  fiatValueNum: number;
  sharePercent: number;
  colorIndex: number;
};

export type ChainBreakdownData = {
  rows: ChainAssetRow[];
};

export const useChainBreakdown = (chainId: ChainId, accountIds: string[]): ChainBreakdownData => {
  const balanceMap = useUnit(balanceModel.$balanceMap);
  const chains = useUnit(networkModel.$chains);
  const prices = useUnit(priceProviderModel.$assetsPrices);
  const currency = useUnit(currencyModel.$activeCurrency);

  return useMemo(() => {
    if (!prices || !currency) return { rows: [] };

    const accountIdSet = new Set(accountIds);
    const chain = chains[chainId];
    if (!chain) return { rows: [] };

    const groupMap = new Map<
      number,
      {
        priceId: string;
        symbol: string;
        name: string;
        icon: { monochrome: string; colored: string };
        precision: number;
        totalRaw: BigNumber;
        fiatValue: BigNumber;
      }
    >();

    for (const balance of Object.values(balanceMap)) {
      if (!accountIdSet.has(balance.accountId)) continue;
      if (balance.chainId !== chainId) continue;

      const asset = chain.assets.find((a) => a.assetId === balance.assetId);
      if (!asset?.priceId) continue;

      const priceItem = prices[asset.priceId]?.[currency.coingeckoId];
      if (!priceItem) continue;

      const rawBN = totalAmountBN(balance);
      const fiat = getRoundedValue(totalAmount(balance), priceItem.price, asset.precision);

      const existing = groupMap.get(asset.assetId);
      if (existing) {
        existing.totalRaw = existing.totalRaw.plus(rawBN.toString());
        existing.fiatValue = existing.fiatValue.plus(fiat);
      } else {
        groupMap.set(asset.assetId, {
          priceId: asset.priceId,
          symbol: asset.symbol,
          name: asset.name,
          icon: asset.icon,
          precision: asset.precision,
          totalRaw: new BigNumber(rawBN.toString()),
          fiatValue: new BigNumber(fiat),
        });
      }
    }

    let totalFiat = new BigNumber(0);
    for (const group of groupMap.values()) {
      totalFiat = totalFiat.plus(group.fiatValue);
    }

    const rows: ChainAssetRow[] = Array.from(groupMap.entries())
      .filter(([, g]) => g.totalRaw.gt(0))
      .map(([assetId, group]) => {
        const fiatNum = group.fiatValue.toNumber();
        const share = totalFiat.gt(0) ? group.fiatValue.div(totalFiat).times(100).toNumber() : 0;

        return {
          assetId,
          priceId: group.priceId,
          symbol: group.symbol,
          name: group.name,
          icon: group.icon,
          precision: group.precision,
          rawAmount: group.totalRaw.toFixed(0),
          rawAmountNum: group.totalRaw.toNumber(),
          fiatValue: group.fiatValue.toString(),
          fiatValueNum: fiatNum,
          sharePercent: Math.round(share * 10) / 10,
          colorIndex: 0,
        };
      })
      .sort((a, b) => b.fiatValueNum - a.fiatValueNum);

    for (let i = 0; i < rows.length; i++) {
      rows[i]!.colorIndex = i;
    }

    return { rows };
  }, [chainId, accountIds, balanceMap, chains, prices, currency]);
};
