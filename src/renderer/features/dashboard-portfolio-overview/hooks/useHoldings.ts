import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { getRoundedValue, totalAmount, totalAmountBN } from '@/shared/lib/utils';
import { type CurrencyItem, useAssetsPrices } from '@/domains/price';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { currencySelect } from '@/aggregates/currency-select';

export type Holding = {
  priceId: string;
  symbol: string;
  name: string;
  icon: { monochrome: string; colored: string };
  precision: number;
  totalRaw: string;
  fiatValue: string;
};

export type HoldingsData = {
  holdings: Holding[];
  totalFiat: string | null;
  fiatFlag: boolean | null;
  currency: CurrencyItem | null;
};

export const useHoldings = (accountIds: string[]): HoldingsData => {
  const balanceMap = useUnit(balanceModel.$balanceMap);
  const chains = useUnit(networkModel.$chains);
  const fiatFlag = useUnit(currencySelect.$fiatFlag);
  const currency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);

  const { holdings, totalFiat } = useMemo(() => {
    if (!prices || !currency) return { holdings: [], totalFiat: null };

    const accountIdSet = new Set(accountIds);

    const groupMap = new Map<
      string,
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

      const chain = chains[balance.chainId];
      if (!chain) continue;

      const asset = chain.assets.find((a) => a.assetId === balance.assetId);
      if (!asset?.priceId) continue;

      const priceItem = prices[asset.priceId]?.[currency.coingeckoId];
      if (!priceItem) continue;

      const rawBN = totalAmountBN(balance);
      const fiat = getRoundedValue(totalAmount(balance), priceItem.price, asset.precision);

      const existing = groupMap.get(asset.priceId);
      if (existing) {
        existing.totalRaw = existing.totalRaw.plus(rawBN.toString());
        existing.fiatValue = existing.fiatValue.plus(fiat);
      } else {
        groupMap.set(asset.priceId, {
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

    const sorted = Array.from(groupMap.values())
      .filter((g) => g.totalRaw.gt(0))
      .sort((a, b) => b.fiatValue.comparedTo(a.fiatValue));

    let total = new BigNumber(0);
    const holdings: Holding[] = sorted.map((group) => {
      total = total.plus(group.fiatValue);

      return {
        priceId: group.priceId,
        symbol: group.symbol,
        name: group.name,
        icon: group.icon,
        precision: group.precision,
        totalRaw: group.totalRaw.toFixed(0),
        fiatValue: group.fiatValue.toString(),
      };
    });

    return { holdings, totalFiat: total.toString() };
  }, [accountIds, balanceMap, chains, prices, currency]);

  return { holdings, totalFiat, fiatFlag, currency };
};
