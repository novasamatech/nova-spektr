import { type BN } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Asset, type Balance, type Chain } from '@/shared/core';
import { getRoundedValue } from '@/shared/lib/utils';
import { type PriceObject, useAssetsPrices } from '@/domains/price';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { currencySelect } from '@/aggregates/currency-select';
import { type BalanceType, BALANCE_TYPES, makeByType, splitBalanceByType } from '../lib/balanceTypes';

export type BalanceTypeTotal = {
  fiat: string;
  pct: number;
};

/**
 * Vesting locked on a chain without a fiat price — cannot join the fiat bar,
 * shown as a token amount
 */
export type UnpricedVested = {
  asset: Asset;
  tokens: BN;
};

export type AllocationData = {
  types: Record<BalanceType, BalanceTypeTotal>;
  grandTotal: string;
  unpricedVested: UnpricedVested[];
};

type BalanceAllocationParams = {
  accountIds: string[];
  balanceMap: Record<string, Balance>;
  chains: Record<string, Chain>;
  prices: PriceObject;
  currency: { coingeckoId: string };
};

/**
 * Pure computation behind {@link useBalanceAllocation}. Split out from the hook
 * so the aggregation logic (unpriced-vesting grouping, empty→null) is testable
 * without a store/React harness.
 */
export function computeBalanceAllocation(params: BalanceAllocationParams): AllocationData | null {
  const { accountIds, balanceMap, chains, prices, currency } = params;

  const accountIdSet = new Set(accountIds);

  const totals: Record<BalanceType, BigNumber> = makeByType(() => new BigNumber(0));
  let grandTotal = new BigNumber(0);
  const unpricedVestedMap = new Map<string, UnpricedVested>();

  for (const balance of Object.values(balanceMap)) {
    if (!accountIdSet.has(balance.accountId)) continue;

    const chain = chains[balance.chainId];
    if (!chain) continue;

    const asset = chain.assets.find((a) => a.assetId === balance.assetId);
    if (!asset) continue;

    const priceItem = asset.priceId ? prices[asset.priceId]?.[currency.coingeckoId] : null;
    if (!priceItem) {
      // unpriced chains (testnets) can still carry a vesting lock — surface it
      // as a token amount so the Vested chip stays consistent with the banner
      const split = splitBalanceByType(balance);
      if (!split.vested.isZero()) {
        const key = `${balance.chainId}:${balance.assetId}`;
        const existing = unpricedVestedMap.get(key);
        unpricedVestedMap.set(key, { asset, tokens: existing ? existing.tokens.add(split.vested) : split.vested });
      }
      continue;
    }

    const split = splitBalanceByType(balance);
    for (const type of BALANCE_TYPES) {
      if (split[type].isZero()) continue;

      const fiat = new BigNumber(getRoundedValue(split[type].toString(), priceItem.price, asset.precision));
      totals[type] = totals[type].plus(fiat);
      grandTotal = grandTotal.plus(fiat);
    }
  }

  const unpricedVested = [...unpricedVestedMap.values()];

  if (grandTotal.isZero() && unpricedVested.length === 0) return null;

  const types: Record<BalanceType, BalanceTypeTotal> = makeByType((type) => ({
    fiat: totals[type].toString(),
    pct: grandTotal.isZero() ? 0 : totals[type].div(grandTotal).multipliedBy(100).toNumber(),
  }));

  return { types, grandTotal: grandTotal.toString(), unpricedVested };
}

export const useBalanceAllocation = (accountIds: string[]): AllocationData | null => {
  const balanceMap = useUnit(balanceModel.$balanceMap);
  const chains = useUnit(networkModel.$chains);
  const currency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);

  return useMemo(() => {
    if (!prices || !currency) return null;

    return computeBalanceAllocation({ accountIds, balanceMap, chains, prices, currency });
  }, [accountIds, balanceMap, chains, prices, currency]);
};
