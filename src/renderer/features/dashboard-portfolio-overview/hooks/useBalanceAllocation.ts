import { BN, BN_ZERO } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Balance, type Chain, type ChainId } from '@/shared/core';
import { getRoundedValue, transferableAmountBN, vestedLockedAmountBN } from '@/shared/lib/utils';
import { useAssetsPrices } from '@/domains/price';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { currencySelect } from '@/aggregates/currency-select';

export type AllocationData = {
  transferablePct: number;
  lockedPct: number;
  reservedPct: number;
  vestedPct: number;
};

type AllocationParams = {
  accountIds: string[];
  balanceMap: Record<string, Balance>;
  chains: Record<ChainId, Chain>;
  prices: Record<string, Record<string, { price: number; change: number }>>;
  currency: { coingeckoId: string };
};

export function computeBalanceAllocation(params: AllocationParams): AllocationData | null {
  const { accountIds, balanceMap, chains, prices, currency } = params;

  const accountIdSet = new Set(accountIds);

  let transferableTotal = new BigNumber(0);
  let reservedTotal = new BigNumber(0);
  let lockedTotal = new BigNumber(0);
  let vestedTotal = new BigNumber(0);
  let grandTotal = new BigNumber(0);

  for (const balance of Object.values(balanceMap)) {
    if (!accountIdSet.has(balance.accountId)) continue;

    const chain = chains[balance.chainId];
    if (!chain) continue;

    const asset = chain.assets.find((a) => a.assetId === balance.assetId);
    if (!asset?.priceId) continue;

    const priceItem = prices[asset.priceId]?.[currency.coingeckoId];
    if (!priceItem) continue;

    const transferable = transferableAmountBN(balance);
    const locked = BN.max(BN_ZERO, balance.free.sub(transferable));
    const vested = BN.min(vestedLockedAmountBN(balance), locked);

    const toFiat = (amount: BN) => new BigNumber(getRoundedValue(amount.toString(), priceItem.price, asset.precision));

    transferableTotal = transferableTotal.plus(toFiat(transferable));
    reservedTotal = reservedTotal.plus(toFiat(balance.reserved));
    lockedTotal = lockedTotal.plus(toFiat(locked.sub(vested)));
    vestedTotal = vestedTotal.plus(toFiat(vested));
    grandTotal = grandTotal.plus(toFiat(balance.free.add(balance.reserved)));
  }

  if (grandTotal.isZero()) return null;

  const toPct = (value: BigNumber) => value.div(grandTotal).multipliedBy(100).toNumber();

  return {
    transferablePct: toPct(transferableTotal),
    lockedPct: toPct(lockedTotal),
    reservedPct: toPct(reservedTotal),
    vestedPct: toPct(vestedTotal),
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
