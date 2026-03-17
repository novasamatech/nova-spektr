import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { formatBalance, formatFiatBalance, getRelaychainAsset, getRoundedValue, toAccountId } from '@/shared/lib/utils';
import { type CurrencyItem, useAssetsPrices } from '@/domains/price';
import { type MonthlyRewardRecord, AssetHubChains, useMonthlyRewards } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { currencySelect } from '@/aggregates/currency-select';

const POLKADOT_AH_CHAIN_ID = AssetHubChains['POLKADOT_AH']!;
const KUSAMA_AH_CHAIN_ID = AssetHubChains['KUSAMA_AH']!;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export type MonthlyBarData = {
  month: string;
  year: number;
  label: string;
  tokenAmount: string;
  fiatAmount: string;
  rawAmount: number;
  isPeak: boolean;
};

export type MonthlyRewardsChartData = {
  dotBars: MonthlyBarData[];
  ksmBars: MonthlyBarData[];
  dotTotal: { token: string; fiat: string; symbol: string; precision: number };
  ksmTotal: { token: string; fiat: string; symbol: string; precision: number };
  pending: boolean;
  fiatFlag: boolean | null;
  currency: CurrencyItem | null;
};

export function generateMonthBoundaries(): { month: number; year: number; start: number; end: number }[] {
  const now = new Date();
  const boundaries: { month: number; year: number; start: number; end: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);

    boundaries.push({
      month: d.getMonth(),
      year: d.getFullYear(),
      start: Math.floor(d.getTime() / 1000),
      end: Math.floor(nextMonth.getTime() / 1000),
    });
  }

  return boundaries;
}

export function bucketRecords(
  records: MonthlyRewardRecord[],
  boundaries: { month: number; year: number; start: number; end: number }[],
  precision: number,
  price: number | undefined,
  currencySymbol: string | undefined,
): MonthlyBarData[] {
  const buckets = new Map<string, BigNumber>();

  for (const boundary of boundaries) {
    buckets.set(`${boundary.year}-${boundary.month}`, new BigNumber(0));
  }

  for (const record of records) {
    for (const boundary of boundaries) {
      if (record.timestamp >= boundary.start && record.timestamp < boundary.end) {
        const key = `${boundary.year}-${boundary.month}`;
        const current = buckets.get(key) ?? new BigNumber(0);
        buckets.set(key, current.plus(record.amount));
        break;
      }
    }
  }

  const bars: MonthlyBarData[] = boundaries.map((boundary) => {
    const key = `${boundary.year}-${boundary.month}`;
    const rawTotal = buckets.get(key) ?? new BigNumber(0);

    const { formatted: tokenFormatted, suffix } = formatBalance(rawTotal.toFixed(0), precision);
    const tokenDisplay = suffix ? `${tokenFormatted}${suffix}` : tokenFormatted;

    let fiatDisplay = '';
    if (price !== undefined) {
      const fiatValue = rawTotal.isZero() ? '0' : getRoundedValue(rawTotal.toFixed(0), price, precision);
      const { formatted: fiatFormatted } = formatFiatBalance(fiatValue);
      fiatDisplay = currencySymbol ? `${currencySymbol}${fiatFormatted}` : fiatFormatted;
    }

    return {
      month: MONTH_NAMES[boundary.month]!,
      year: boundary.year,
      label: `${MONTH_NAMES[boundary.month]!} ${boundary.year}`,
      tokenAmount: tokenDisplay,
      fiatAmount: fiatDisplay,
      rawAmount: rawTotal.dividedBy(new BigNumber(10).pow(precision)).toNumber(),
      isPeak: false,
    };
  });

  const maxAmount = Math.max(...bars.map((b) => b.rawAmount));
  if (maxAmount > 0) {
    const peakIndex = bars.findIndex((b) => b.rawAmount === maxAmount);
    if (peakIndex >= 0 && bars[peakIndex]) {
      bars[peakIndex] = { ...bars[peakIndex], isPeak: true };
    }
  }

  return bars;
}

export const useMonthlyRewardsChart = (accountIds: string[]): MonthlyRewardsChartData => {
  const chains = useUnit(networkModel.$chains);
  const fiatFlag = useUnit(currencySelect.$fiatFlag);
  const currency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);

  const typedAccountIds = useMemo(() => accountIds.map((id) => toAccountId(id)), [accountIds]);

  const polkadotChain = chains[POLKADOT_AH_CHAIN_ID] ?? null;
  const kusamaChain = chains[KUSAMA_AH_CHAIN_ID] ?? null;

  const { data: dotRecords, pending: dotPending } = useMonthlyRewards(typedAccountIds, polkadotChain, chains);
  const { data: ksmRecords, pending: ksmPending } = useMonthlyRewards(typedAccountIds, kusamaChain, chains);

  const boundaries = useMemo(() => generateMonthBoundaries(), []);

  const result = useMemo(() => {
    const emptyTotal = { token: '0', fiat: '0', symbol: '', precision: 0 };

    const processChain = (chainId: ChainId, records: MonthlyRewardRecord[]) => {
      const chain = chains[chainId];
      if (!chain) return { bars: [], total: emptyTotal };

      const asset = getRelaychainAsset(chain.assets);
      if (!asset?.priceId) return { bars: [], total: emptyTotal };

      const priceItem = prices?.[asset.priceId]?.[currency?.coingeckoId ?? ''];
      const priceValue = priceItem?.price;

      const bars = bucketRecords(records, boundaries, asset.precision, priceValue, currency?.symbol);

      const totalRaw = records.reduce((sum, r) => sum.plus(r.amount), new BigNumber(0));
      const { formatted: tokenTotal, suffix } = formatBalance(totalRaw.toFixed(0), asset.precision);
      const tokenTotalDisplay = suffix ? `${tokenTotal}${suffix}` : tokenTotal;

      let fiatTotal = '0';
      if (priceValue !== undefined) {
        fiatTotal = totalRaw.isZero() ? '0' : getRoundedValue(totalRaw.toFixed(0), priceValue, asset.precision);
      }

      return {
        bars,
        total: { token: tokenTotalDisplay, fiat: fiatTotal, symbol: asset.symbol, precision: asset.precision },
      };
    };

    const dot = processChain(POLKADOT_AH_CHAIN_ID, dotRecords);
    const ksm = processChain(KUSAMA_AH_CHAIN_ID, ksmRecords);

    return { dotBars: dot.bars, ksmBars: ksm.bars, dotTotal: dot.total, ksmTotal: ksm.total };
  }, [chains, prices, currency, dotRecords, ksmRecords, boundaries]);

  return {
    ...result,
    pending: accountIds.length > 0 && (dotPending || ksmPending),
    fiatFlag,
    currency,
  };
};
