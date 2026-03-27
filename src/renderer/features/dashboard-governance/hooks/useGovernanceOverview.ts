import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { getRoundedValue } from '@/shared/lib/utils';
import { type CurrencyItem, useAssetsPrices } from '@/domains/price';
import { AssetHubChains } from '@/domains/staking';
import { currencySelect } from '@/aggregates/currency-select';

import { type ChainGovernanceData, useChainGovernanceData } from './useChainGovernanceData';

const POLKADOT_AH_CHAIN_ID = AssetHubChains['POLKADOT_AH'];
const KUSAMA_AH_CHAIN_ID = AssetHubChains['KUSAMA_AH'];

export type ChainGovernanceSummary = ChainGovernanceData & {
  chainId: ChainId;
  totalLockedFiat: string;
  claimableFiat: string;
};

export type GovernanceOverviewResult = {
  chains: ChainGovernanceSummary[];
  totalFiat: string | null;
  pending: boolean;
  fiatFlag: boolean | null;
  currency: CurrencyItem | null;
};

export const useGovernanceOverview = (accountIds: string[]): GovernanceOverviewResult => {
  const fiatFlag = useUnit(currencySelect.$fiatFlag);
  const currency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);

  const polkadotData = useChainGovernanceData(POLKADOT_AH_CHAIN_ID, accountIds);
  const kusamaData = useChainGovernanceData(KUSAMA_AH_CHAIN_ID, accountIds);

  const result = useMemo(() => {
    if (!prices || !currency) {
      return { chains: [], totalFiat: null };
    }

    const entries = [
      { chainId: POLKADOT_AH_CHAIN_ID, data: polkadotData },
      { chainId: KUSAMA_AH_CHAIN_ID, data: kusamaData },
    ] as const;

    const summaries: ChainGovernanceSummary[] = [];
    let grandTotal = new BigNumber(0);

    for (const { chainId, data } of entries) {
      if (!data || data.activeVotingAccounts === 0) continue;

      const priceItem = prices[data.priceId]?.[currency.coingeckoId];
      const toFiat = (amount: string) => (priceItem ? getRoundedValue(amount, priceItem.price, data.precision) : '0');

      const lockedFiat = toFiat(data.totalLocked);
      grandTotal = grandTotal.plus(lockedFiat);

      summaries.push({
        ...data,
        chainId,
        totalLockedFiat: lockedFiat,
        claimableFiat: toFiat(data.claimableAmount),
      });
    }

    return { chains: summaries, totalFiat: grandTotal.toString() };
  }, [polkadotData, kusamaData, prices, currency]);

  return {
    ...result,
    pending:
      accountIds.length > 0 &&
      ((polkadotData === null && kusamaData === null) ||
        (polkadotData?.pending ?? false) ||
        (kusamaData?.pending ?? false)),
    fiatFlag,
    currency,
  };
};
