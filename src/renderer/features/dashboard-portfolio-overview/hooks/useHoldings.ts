import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { getRoundedValue, totalAmount, totalAmountBN } from '@/shared/lib/utils';
import { type CurrencyItem, useAssetsPrices } from '@/domains/price';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { currencySelect } from '@/aggregates/currency-select';
import { type BalanceType, BALANCE_TYPES, makeByType, splitBalanceForHoldings } from '../lib/balanceTypes';

export type HoldingByType = Record<BalanceType, { raw: string; fiat: string }>;

export type Holding = {
  priceId: string;
  symbol: string;
  name: string;
  icon: { monochrome: string; colored: string };
  precision: number;
  totalRaw: string;
  fiatValue: string;
  change: number | null;
  byType: HoldingByType;
};

export type HoldingsData = {
  holdings: Holding[];
  totalFiat: string | null;
  fiatFlag: boolean | null;
  currency: CurrencyItem | null;
};

type ByTypeAccumulator = Record<BalanceType, { raw: BigNumber; fiat: BigNumber }>;

const makeByTypeAccumulator = (): ByTypeAccumulator =>
  makeByType(() => ({ raw: new BigNumber(0), fiat: new BigNumber(0) }));

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
        change: number | null;
        byType: ByTypeAccumulator;
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
      const split = splitBalanceForHoldings(balance);

      let group = groupMap.get(asset.priceId);
      if (group) {
        group.totalRaw = group.totalRaw.plus(rawBN.toString());
        group.fiatValue = group.fiatValue.plus(fiat);
      } else {
        group = {
          priceId: asset.priceId,
          symbol: asset.symbol,
          name: asset.name,
          icon: asset.icon,
          precision: asset.precision,
          totalRaw: new BigNumber(rawBN.toString()),
          fiatValue: new BigNumber(fiat),
          change: priceItem.change ?? null,
          byType: makeByTypeAccumulator(),
        };
        groupMap.set(asset.priceId, group);
      }

      for (const type of BALANCE_TYPES) {
        if (split[type].isZero()) continue;

        const typeRaw = split[type].toString();
        const typeFiat = getRoundedValue(typeRaw, priceItem.price, asset.precision);
        group.byType[type].raw = group.byType[type].raw.plus(typeRaw);
        group.byType[type].fiat = group.byType[type].fiat.plus(typeFiat);
      }
    }

    const sorted = Array.from(groupMap.values())
      .filter((g) => g.totalRaw.gt(0))
      .sort((a, b) => b.fiatValue.comparedTo(a.fiatValue));

    let total = new BigNumber(0);
    const holdings: Holding[] = sorted.map((group) => {
      total = total.plus(group.fiatValue);

      const byType: HoldingByType = makeByType((type) => ({
        raw: group.byType[type].raw.toFixed(0),
        fiat: group.byType[type].fiat.toString(),
      }));

      return {
        priceId: group.priceId,
        symbol: group.symbol,
        name: group.name,
        icon: group.icon,
        precision: group.precision,
        totalRaw: group.totalRaw.toFixed(0),
        fiatValue: group.fiatValue.toString(),
        change: group.change,
        byType,
      };
    });

    return { holdings, totalFiat: total.toString() };
  }, [accountIds, balanceMap, chains, prices, currency]);

  return { holdings, totalFiat, fiatFlag, currency };
};
