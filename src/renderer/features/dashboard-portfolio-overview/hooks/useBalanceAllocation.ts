import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

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

export const useBalanceAllocation = (accountIds: string[]): AllocationData | null => {
  const balanceMap = useUnit(balanceModel.$balanceMap);
  const chains = useUnit(networkModel.$chains);
  const currency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);

  return useMemo(() => {
    if (!prices || !currency) return null;

    const accountIdSet = new Set(accountIds);

    let transferableTotal = new BigNumber(0);
    let reservedTotal = new BigNumber(0);
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

      const transferableRaw = transferableAmountBN(balance);
      const transferableFiat = new BigNumber(
        getRoundedValue(transferableRaw.toString(), priceItem.price, asset.precision),
      );

      const reservedFiat = new BigNumber(
        getRoundedValue(balance.reserved.toString(), priceItem.price, asset.precision),
      );

      const vestedFiat = new BigNumber(
        getRoundedValue(vestedLockedAmountBN(balance).toString(), priceItem.price, asset.precision),
      );

      const totalFiat = new BigNumber(
        getRoundedValue(balance.free.add(balance.reserved).toString(), priceItem.price, asset.precision),
      );

      transferableTotal = transferableTotal.plus(transferableFiat);
      reservedTotal = reservedTotal.plus(reservedFiat);
      vestedTotal = vestedTotal.plus(vestedFiat);
      grandTotal = grandTotal.plus(totalFiat);
    }

    if (grandTotal.isZero()) return null;

    const lockedFiat = BigNumber.max(0, grandTotal.minus(transferableTotal).minus(reservedTotal));
    // The vesting lock is part of `frozen`, so it is already inside the Locked
    // residual. `frozen` is the max of all locks (not their sum), so clamp the
    // Vested slice to the residual to avoid a negative Locked / bars over 100%.
    const vestedFiat = BigNumber.min(vestedTotal, lockedFiat);

    return {
      transferablePct: transferableTotal.div(grandTotal).multipliedBy(100).toNumber(),
      lockedPct: lockedFiat.minus(vestedFiat).div(grandTotal).multipliedBy(100).toNumber(),
      reservedPct: reservedTotal.div(grandTotal).multipliedBy(100).toNumber(),
      vestedPct: vestedFiat.div(grandTotal).multipliedBy(100).toNumber(),
    };
  }, [accountIds, balanceMap, chains, prices, currency]);
};
