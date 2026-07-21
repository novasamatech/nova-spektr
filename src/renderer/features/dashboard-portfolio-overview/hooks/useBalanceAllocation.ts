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
import { type BalanceType, BALANCE_TYPES, makeByType, splitBalanceByType, vestingOverlapBN } from '../lib/balanceTypes';

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
  unpricedVested: UnpricedVested[];
  /**
   * Vesting that rides on reserved funds — see {@link vestingOverlapBN}.
   *
   * Deliberately **not** one of `types`: those four sum to the total and drive
   * the bar's geometry, while this overlaps `reserved` rather than sitting
   * beside it. Adding it to the partition would inflate every percentage;
   * subtracting it from `reserved` would understate a figure the user can check
   * against a block explorer. `pct` is expressed against the same total as
   * `types`, so it can be drawn as a marker over the segments it covers.
   */
  vestedOverlap: BalanceTypeTotal;
  /**
   * Everything under a vesting schedule — `types.vested` plus
   * {@link AllocationData.vestedOverlap}. What the Vested chip prints, so that
   * the figure the user reads matches the schedules the callout below counts.
   */
  vestedTotalFiat: string;
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
  let overlapTotal = new BigNumber(0);
  const unpricedVestedMap = new Map<string, UnpricedVested>();

  for (const balance of Object.values(balanceMap)) {
    if (!accountIdSet.has(balance.accountId)) continue;

    const chain = chains[balance.chainId];
    if (!chain) continue;

    const asset = chain.assets.find((a) => a.assetId === balance.assetId);
    if (!asset) continue;

    const split = splitBalanceByType(balance);
    const overlap = vestingOverlapBN(balance);

    const priceItem = asset.priceId ? prices[asset.priceId]?.[currency.coingeckoId] : null;
    if (!priceItem) {
      // unpriced chains (testnets) can still carry a vesting lock — surface it
      // as a token amount so the Vested chip stays consistent with the banner.
      // The overlapping part counts here too: it is just as real to the user,
      // and on an unpriced chain there is no bar for it to distort.
      const vesting = split.vested.add(overlap);
      if (!vesting.isZero()) {
        const key = `${balance.chainId}:${balance.assetId}`;
        const existing = unpricedVestedMap.get(key);
        unpricedVestedMap.set(key, { asset, tokens: existing ? existing.tokens.add(vesting) : vesting });
      }
      continue;
    }

    for (const type of BALANCE_TYPES) {
      if (split[type].isZero()) continue;

      const fiat = new BigNumber(getRoundedValue(split[type].toString(), priceItem.price, asset.precision));
      totals[type] = totals[type].plus(fiat);
      grandTotal = grandTotal.plus(fiat);
    }

    // Outside the loop above on purpose: this must not touch `grandTotal`.
    if (!overlap.isZero()) {
      overlapTotal = overlapTotal.plus(
        new BigNumber(getRoundedValue(overlap.toString(), priceItem.price, asset.precision)),
      );
    }
  }

  const unpricedVested = [...unpricedVestedMap.values()];

  if (grandTotal.isZero() && unpricedVested.length === 0) return null;

  const toTotal = (fiat: BigNumber): BalanceTypeTotal => ({
    fiat: fiat.toString(),
    pct: grandTotal.isZero() ? 0 : fiat.div(grandTotal).multipliedBy(100).toNumber(),
  });

  const types: Record<BalanceType, BalanceTypeTotal> = makeByType((type) => toTotal(totals[type]));

  return {
    types,
    unpricedVested,
    vestedOverlap: toTotal(overlapTotal),
    vestedTotalFiat: totals.vested.plus(overlapTotal).toString(),
  };
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
