import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useCallback, useMemo } from 'react';

import { type Asset, type Chain, type ChainId } from '@/shared/core';
import { getRelaychainAsset, getRoundedValue } from '@/shared/lib/utils';
import { type CurrencyItem, useAssetsPrices } from '@/domains/price';
import { currencySelect } from '@/aggregates/currency-select';
import { stakingPositions } from '@/aggregates/staking-positions';

export type StakingChainAsset = {
  chainId: ChainId;
  chain: Chain;
  chainName: string;
  asset: Asset;
  symbol: string;
  precision: number;
  priceId: string | null;
  /** Price of one token in the active currency, `null` without a feed. */
  price: number | null;
};

export type StakingChainAssets = {
  byChain: Record<ChainId, StakingChainAsset>;
  chains: StakingChainAsset[];
  currency: CurrencyItem | null;
  fiatFlag: boolean | null;
  /** Prices have resolved — until then every fiat figure is a guess. */
  pricesReady: boolean;
  /** Planck of the chain's staking asset → fiat, `'0'` without a price. */
  toFiat: (chainId: ChainId, planck: string) => string;
};

/**
 * The staking asset of every staking chain, with its price attached. Everything
 * fiat on the KPI row goes through here so a chain without a price feed
 * degrades to zero fiat instead of silently poisoning a total.
 */
export const useStakingChainAssets = (): StakingChainAssets => {
  const stakingChains = useUnit(stakingPositions.$stakingChains);
  const fiatFlag = useUnit(currencySelect.$fiatFlag);
  const currency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);

  const { byChain, chains } = useMemo(() => {
    const byChain: Record<ChainId, StakingChainAsset> = {};
    const chains: StakingChainAsset[] = [];

    for (const chain of stakingChains) {
      const asset = getRelaychainAsset(chain.assets);
      if (!asset) continue;

      const priceId = asset.priceId ?? null;
      const priceItem = priceId && prices && currency ? prices[priceId]?.[currency.coingeckoId] : null;

      const entry: StakingChainAsset = {
        chainId: chain.chainId,
        chain,
        chainName: chain.name,
        asset,
        symbol: asset.symbol,
        precision: asset.precision,
        priceId,
        price: priceItem?.price ?? null,
      };

      byChain[chain.chainId] = entry;
      chains.push(entry);
    }

    return { byChain, chains };
  }, [stakingChains, prices, currency]);

  const toFiat = useCallback(
    (chainId: ChainId, planck: string): string => {
      const entry = byChain[chainId];
      if (!entry || entry.price === null) return '0';

      const amount = new BigNumber(planck || '0');
      if (!amount.gt(0)) return '0';

      return getRoundedValue(amount.toFixed(0), entry.price, entry.precision);
    },
    [byChain],
  );

  return {
    byChain,
    chains,
    currency,
    fiatFlag,
    pricesReady: Boolean(prices && currency),
    toFiat,
  };
};
