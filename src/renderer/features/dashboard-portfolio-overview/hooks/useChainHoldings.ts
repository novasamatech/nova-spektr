import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { getRoundedValue, totalAmount, totalAmountBN } from '@/shared/lib/utils';
import { type CurrencyItem } from '@/domains/price';
import { currencyModel, priceProviderModel, useAssetsPrices } from '@/domains/price';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';

export type ChainHolding = {
  chainId: ChainId;
  chainName: string;
  chainIcon: string;
  assetCount: number;
  fiatValue: string;
};

export type ChainHoldingsData = {
  chainHoldings: ChainHolding[];
  totalFiat: string | null;
  fiatFlag: boolean | null;
  currency: CurrencyItem | null;
};

export const useChainHoldings = (accountIds: string[]): ChainHoldingsData => {
  const balanceMap = useUnit(balanceModel.$balanceMap);
  const chains = useUnit(networkModel.$chains);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const currency = useUnit(currencyModel.$activeCurrency);
  const pricesParams = useUnit(priceProviderModel.$currentPricesParams);
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

      const existing = groupMap.get(balance.chainId);
      if (existing) {
        existing.assetIds.add(asset.assetId);
        existing.fiatValue = existing.fiatValue.plus(fiat);
      } else {
        groupMap.set(balance.chainId, {
          chainName: chain.name,
          chainIcon: chain.icon,
          assetIds: new Set([asset.assetId]),
          fiatValue: new BigNumber(fiat),
        });
      }
    }

    const sorted = Array.from(groupMap.entries()).sort((a, b) => b[1].fiatValue.comparedTo(a[1].fiatValue));

    let total = new BigNumber(0);
    const chainHoldings: ChainHolding[] = sorted.map(([chainId, group]) => {
      total = total.plus(group.fiatValue);

      return {
        chainId,
        chainName: group.chainName,
        chainIcon: group.chainIcon,
        assetCount: group.assetIds.size,
        fiatValue: group.fiatValue.toString(),
      };
    });

    return { chainHoldings, totalFiat: total.toString() };
  }, [accountIds, balanceMap, chains, prices, currency]);

  return { chainHoldings, totalFiat, fiatFlag, currency };
};
