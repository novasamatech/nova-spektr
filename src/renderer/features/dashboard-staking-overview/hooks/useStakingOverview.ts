import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId, type EraIndex } from '@/shared/core';
import {
  getRelaychainAsset,
  getRoundedValue,
  redeemableAmount,
  toAccountId,
  unlockingAmount,
} from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type CurrencyItem } from '@/domains/price';
import { currencyModel, priceProviderModel, useAssetsPrices } from '@/domains/price';
import { type StakingMap, AssetHubChains, useActiveEra, useNetworkApy, useStaking } from '@/domains/staking';
import { networkModel, useApi } from '@/entities/network';

import { useActiveValidatorCount } from './useActiveValidatorCount';

export type ChainStakingSummary = {
  chainId: ChainId;
  chainName: string;
  symbol: string;
  precision: number;
  icon: { monochrome: string; colored: string };
  totalStaked: string;
  fiatValue: string;
  priceId: string;
  totalUnstaking: string;
  totalRedeemable: string;
  unstakingFiatValue: string;
  redeemableFiatValue: string;
  activeValidatorCount?: number;
  apy?: string;
};

export type StakingOverviewData = {
  chains: ChainStakingSummary[];
  stakingDataByChain: Record<ChainId, StakingMap>;
  totalFiat: string | null;
  totalActiveValidators: number | undefined;
  pending: boolean;
  fiatFlag: boolean | null;
  currency: CurrencyItem | null;
};

const POLKADOT_AH_CHAIN_ID = AssetHubChains['POLKADOT_AH']!;
const KUSAMA_AH_CHAIN_ID = AssetHubChains['KUSAMA_AH']!;

type StakingBreakdown = {
  total: BigNumber;
  active: BigNumber;
  unstaking: BigNumber;
  redeemable: BigNumber;
};

function computeBreakdown(
  stakingData: StakingMap,
  accountIds: AccountId[],
  era: EraIndex | undefined,
): StakingBreakdown {
  const accountSet = new Set(accountIds.map(String));
  let total = new BigNumber(0);
  let active = new BigNumber(0);
  let unstaking = new BigNumber(0);
  let redeemable = new BigNumber(0);

  for (const [accountId, stake] of Object.entries(stakingData)) {
    if (!accountSet.has(accountId) || !stake) continue;

    total = total.plus(stake.total);
    active = active.plus(stake.active);

    if (era !== undefined && stake.unlocking.length > 0) {
      const redeem = new BigNumber(redeemableAmount(stake.unlocking, era));
      const totalUnlocking = new BigNumber(unlockingAmount(stake.unlocking));
      redeemable = redeemable.plus(redeem);
      unstaking = unstaking.plus(totalUnlocking.minus(redeem));
    }
  }

  return { total, active, unstaking, redeemable };
}

export const useStakingOverview = (accountIds: string[]): StakingOverviewData => {
  const chains = useUnit(networkModel.$chains);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const currency = useUnit(currencyModel.$activeCurrency);
  const pricesParams = useUnit(priceProviderModel.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);

  const polkadotApi = useApi(POLKADOT_AH_CHAIN_ID);
  const kusamaApi = useApi(KUSAMA_AH_CHAIN_ID);

  const { data: polkadotEra } = useActiveEra({ chainId: POLKADOT_AH_CHAIN_ID, api: polkadotApi });
  const { data: kusamaEra } = useActiveEra({ chainId: KUSAMA_AH_CHAIN_ID, api: kusamaApi });

  const typedAccountIds = useMemo(() => accountIds.map((id) => toAccountId(id)), [accountIds]);

  const { data: polkadotStaking, pending: polkadotPending } = useStaking({
    chainId: POLKADOT_AH_CHAIN_ID,
    api: polkadotApi,
    accounts: typedAccountIds,
  });

  const { data: kusamaStaking, pending: kusamaPending } = useStaking({
    chainId: KUSAMA_AH_CHAIN_ID,
    api: kusamaApi,
    accounts: typedAccountIds,
  });

  const { count: polkadotValidatorCount } = useActiveValidatorCount(
    polkadotApi,
    polkadotStaking,
    typedAccountIds,
    polkadotEra,
  );
  const { count: kusamaValidatorCount } = useActiveValidatorCount(kusamaApi, kusamaStaking, typedAccountIds, kusamaEra);

  const { data: polkadotApy, pending: polkadotApyPending } = useNetworkApy({
    api: polkadotApi,
    era: polkadotEra,
    chainId: POLKADOT_AH_CHAIN_ID,
  });
  const { data: kusamaApy, pending: kusamaApyPending } = useNetworkApy({
    api: kusamaApi,
    era: kusamaEra,
    chainId: KUSAMA_AH_CHAIN_ID,
  });

  const validatorCountByChain: Record<string, number | undefined> = useMemo(
    () => ({
      [POLKADOT_AH_CHAIN_ID]: polkadotValidatorCount,
      [KUSAMA_AH_CHAIN_ID]: kusamaValidatorCount,
    }),
    [polkadotValidatorCount, kusamaValidatorCount],
  );

  const apyByChain: Record<string, string | undefined> = useMemo(
    () => ({
      [POLKADOT_AH_CHAIN_ID]: polkadotApy,
      [KUSAMA_AH_CHAIN_ID]: kusamaApy,
    }),
    [polkadotApy, kusamaApy],
  );

  const result = useMemo(() => {
    const stakingDataByChain: Record<ChainId, StakingMap> = {
      [POLKADOT_AH_CHAIN_ID]: polkadotStaking,
      [KUSAMA_AH_CHAIN_ID]: kusamaStaking,
    };

    if (!prices || !currency)
      return { chains: [], stakingDataByChain, totalFiat: null, totalActiveValidators: undefined };

    const summaries: ChainStakingSummary[] = [];
    let grandTotal = new BigNumber(0);

    const entries = [
      { chainId: POLKADOT_AH_CHAIN_ID, stakingData: polkadotStaking, era: polkadotEra },
      { chainId: KUSAMA_AH_CHAIN_ID, stakingData: kusamaStaking, era: kusamaEra },
    ] as const;

    for (const { chainId, stakingData, era } of entries) {
      const chain = chains[chainId];
      if (!chain) continue;

      const asset = getRelaychainAsset(chain.assets);
      if (!asset?.priceId) continue;

      const breakdown = computeBreakdown(stakingData, typedAccountIds, era);
      if (breakdown.total.isZero()) continue;

      const priceItem = prices[asset.priceId]?.[currency.coingeckoId];
      const toFiat = (raw: BigNumber): BigNumber =>
        priceItem ? new BigNumber(getRoundedValue(raw.toFixed(0), priceItem.price, asset.precision)) : new BigNumber(0);

      const fiatValue = toFiat(breakdown.total);
      grandTotal = grandTotal.plus(fiatValue);

      summaries.push({
        chainId,
        chainName: chain.name,
        symbol: asset.symbol,
        precision: asset.precision,
        icon: asset.icon,
        totalStaked: breakdown.total.toFixed(0),
        fiatValue: fiatValue.toString(),
        priceId: asset.priceId,
        totalUnstaking: breakdown.unstaking.toFixed(0),
        totalRedeemable: breakdown.redeemable.toFixed(0),
        unstakingFiatValue: toFiat(breakdown.unstaking).toString(),
        redeemableFiatValue: toFiat(breakdown.redeemable).toString(),
        activeValidatorCount: validatorCountByChain[chainId],
        apy: apyByChain[chainId],
      });
    }

    const totalActiveValidators = summaries.every((s) => s.activeValidatorCount !== undefined)
      ? summaries.reduce((sum, s) => sum + s.activeValidatorCount!, 0)
      : undefined;

    return { chains: summaries, stakingDataByChain, totalFiat: grandTotal.toString(), totalActiveValidators };
  }, [
    chains,
    prices,
    currency,
    polkadotStaking,
    kusamaStaking,
    typedAccountIds,
    polkadotEra,
    kusamaEra,
    validatorCountByChain,
    apyByChain,
  ]);

  return {
    ...result,
    pending: accountIds.length > 0 && (polkadotPending || kusamaPending || polkadotApyPending || kusamaApyPending),
    fiatFlag,
    currency,
  };
};
