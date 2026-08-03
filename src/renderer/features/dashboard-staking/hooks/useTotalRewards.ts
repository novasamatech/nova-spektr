import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { getRelaychainAsset, getRoundedValue, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type CurrencyItem, useAssetsPrices } from '@/domains/price';
import { type RewardsMap, AssetHubChains, useStakingRewards } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { currencySelect } from '@/aggregates/currency-select';

export type ChainRewardsSummary = {
  chainId: ChainId;
  chainName: string;
  symbol: string;
  precision: number;
  priceId: string;
  icon: { monochrome: string; colored: string };
  totalRewards: string;
  fiatValue: string;
};

export type TotalRewardsData = {
  chains: ChainRewardsSummary[];
  rewardsMapByChain: Record<ChainId, RewardsMap>;
  totalFiat: string | null;
  pending: boolean;
  fiatFlag: boolean | null;
  currency: CurrencyItem | null;
};

const POLKADOT_AH_CHAIN_ID = AssetHubChains['POLKADOT_AH']!;
const KUSAMA_AH_CHAIN_ID = AssetHubChains['KUSAMA_AH']!;

function sumRewards(rewardsMap: RewardsMap, accountIds: AccountId[]): BigNumber {
  const accountSet = new Set(accountIds.map(String));
  let total = new BigNumber(0);

  for (const [accountId, reward] of Object.entries(rewardsMap)) {
    if (!accountSet.has(accountId) || !reward) continue;
    total = total.plus(reward);
  }

  return total;
}

/**
 * @deprecated Superseded by `useStakingKpi().rewardsFiat` / `rewardAmounts` in
 *   `features/dashboard-staking-kpi`.
 */
export const useTotalRewards = (accountIds: string[], since?: number): TotalRewardsData => {
  const chains = useUnit(networkModel.$chains);
  const fiatFlag = useUnit(currencySelect.$fiatFlag);
  const currency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);

  const typedAccountIds = useMemo(() => accountIds.map((id) => toAccountId(id)), [accountIds]);

  const polkadotChain = chains[POLKADOT_AH_CHAIN_ID] ?? null;
  const kusamaChain = chains[KUSAMA_AH_CHAIN_ID] ?? null;

  const { data: polkadotRewards, pending: polkadotPending } = useStakingRewards(
    typedAccountIds,
    polkadotChain,
    chains,
    since,
  );
  const { data: kusamaRewards, pending: kusamaPending } = useStakingRewards(
    typedAccountIds,
    kusamaChain,
    chains,
    since,
  );

  const result = useMemo(() => {
    const rewardsMapByChain: Record<ChainId, RewardsMap> = {
      [POLKADOT_AH_CHAIN_ID]: polkadotRewards,
      [KUSAMA_AH_CHAIN_ID]: kusamaRewards,
    };

    if (!prices || !currency) return { chains: [], rewardsMapByChain, totalFiat: null };

    const summaries: ChainRewardsSummary[] = [];
    let grandTotal = new BigNumber(0);

    const entries = [
      { chainId: POLKADOT_AH_CHAIN_ID, rewardsMap: polkadotRewards },
      { chainId: KUSAMA_AH_CHAIN_ID, rewardsMap: kusamaRewards },
    ] as const;

    for (const { chainId, rewardsMap } of entries) {
      const chain = chains[chainId];
      if (!chain) continue;

      const asset = getRelaychainAsset(chain.assets);
      if (!asset?.priceId) continue;

      const totalRewards = sumRewards(rewardsMap, typedAccountIds);
      if (totalRewards.isZero()) continue;

      const priceItem = prices[asset.priceId]?.[currency.coingeckoId];
      const fiatValue = priceItem
        ? new BigNumber(getRoundedValue(totalRewards.toFixed(0), priceItem.price, asset.precision))
        : new BigNumber(0);

      grandTotal = grandTotal.plus(fiatValue);

      summaries.push({
        chainId,
        chainName: chain.name,
        symbol: asset.symbol,
        precision: asset.precision,
        priceId: asset.priceId,
        icon: asset.icon,
        totalRewards: totalRewards.toFixed(0),
        fiatValue: fiatValue.toString(),
      });
    }

    return { chains: summaries, rewardsMapByChain, totalFiat: grandTotal.toString() };
  }, [chains, prices, currency, polkadotRewards, kusamaRewards, typedAccountIds]);

  return {
    chains: result.chains,
    rewardsMapByChain: result.rewardsMapByChain,
    totalFiat: result.totalFiat,
    pending: accountIds.length > 0 && (polkadotPending || kusamaPending),
    fiatFlag,
    currency,
  };
};
