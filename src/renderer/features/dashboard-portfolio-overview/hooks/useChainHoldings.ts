import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { getRoundedValue, totalAmount, totalAmountBN } from '@/shared/lib/utils';
import { type CurrencyItem, useAssetsPrices } from '@/domains/price';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { currencySelect } from '@/aggregates/currency-select';
import { type BalanceType, BALANCE_TYPES, makeByType, splitBalanceForHoldings } from '../lib/balanceTypes';

export type ChainHoldingByType = Record<BalanceType, { fiat: string; assetCount: number }>;

export type ChainHolding = {
  chainId: ChainId;
  chainName: string;
  chainIcon: string;
  assetCount: number;
  fiatValue: string;
  byType: ChainHoldingByType;
};

export type ChainHoldingsData = {
  chainHoldings: ChainHolding[];
  totalFiat: string | null;
  fiatFlag: boolean | null;
  currency: CurrencyItem | null;
};

type ByTypeAccumulator = Record<BalanceType, { fiat: BigNumber; assetIds: Set<number> }>;

const makeByTypeAccumulator = (): ByTypeAccumulator =>
  makeByType(() => ({ fiat: new BigNumber(0), assetIds: new Set<number>() }));

export const useChainHoldings = (accountIds: string[]): ChainHoldingsData => {
  const balanceMap = useUnit(balanceModel.$balanceMap);
  const chains = useUnit(networkModel.$chains);
  const fiatFlag = useUnit(currencySelect.$fiatFlag);
  const currency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);

  const { chainHoldings, totalFiat } = useMemo(() => {
    if (!prices || !currency) return { chainHoldings: [], totalFiat: null };

    const accountIdSet = new Set(accountIds);

    const groupMap = new Map<
      ChainId,
      {
        chainName: string;
        chainIcon: string;
        assetIds: Set<number>;
        fiatValue: BigNumber;
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
      if (rawBN.isZero()) continue;

      const fiat = getRoundedValue(totalAmount(balance), priceItem.price, asset.precision);
      const split = splitBalanceForHoldings(balance);

      let group = groupMap.get(balance.chainId);
      if (group) {
        group.assetIds.add(asset.assetId);
        group.fiatValue = group.fiatValue.plus(fiat);
      } else {
        group = {
          chainName: chain.name,
          chainIcon: chain.icon,
          assetIds: new Set([asset.assetId]),
          fiatValue: new BigNumber(fiat),
          byType: makeByTypeAccumulator(),
        };
        groupMap.set(balance.chainId, group);
      }

      for (const type of BALANCE_TYPES) {
        if (split[type].isZero()) continue;

        const typeFiat = getRoundedValue(split[type].toString(), priceItem.price, asset.precision);
        group.byType[type].fiat = group.byType[type].fiat.plus(typeFiat);
        group.byType[type].assetIds.add(asset.assetId);
      }
    }

    const sorted = Array.from(groupMap.entries()).sort((a, b) => b[1].fiatValue.comparedTo(a[1].fiatValue));

    let total = new BigNumber(0);
    const chainHoldings: ChainHolding[] = sorted.map(([chainId, group]) => {
      total = total.plus(group.fiatValue);

      const byType: ChainHoldingByType = makeByType((type) => ({
        fiat: group.byType[type].fiat.toString(),
        assetCount: group.byType[type].assetIds.size,
      }));

      return {
        chainId,
        chainName: group.chainName,
        chainIcon: group.chainIcon,
        assetCount: group.assetIds.size,
        fiatValue: group.fiatValue.toString(),
        byType,
      };
    });

    return { chainHoldings, totalFiat: total.toString() };
  }, [accountIds, balanceMap, chains, prices, currency]);

  return { chainHoldings, totalFiat, fiatFlag, currency };
};
