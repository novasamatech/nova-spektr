import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { formatBalance, formatFiatBalance, getRelaychainAsset, getRoundedValue, toAccountId } from '@/shared/lib/utils';
import { FALLBACK_COLORS } from '@/shared/ui/chart-constants';
import { type CurrencyItem, useAssetsPrices } from '@/domains/price';
import { type MonthlyRewardRecord, AssetHubChains, useMonthlyRewards } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { currencySelect } from '@/aggregates/currency-select';

const POLKADOT_AH_CHAIN_ID = AssetHubChains['POLKADOT_AH']!;
const KUSAMA_AH_CHAIN_ID = AssetHubChains['KUSAMA_AH']!;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const DOT_COLORS = ['#e6007a', '#ff4da6', '#cc006c', '#b30060', '#ff80c0', '#990052', '#ff1a8c', '#d40071'];
const KSM_COLORS = ['#333', '#555', '#222', '#444', '#666', '#1a1a1a', '#777', '#111'];

export type ChainMode = 'dot' | 'ksm';

export const getAccountColor = (index: number, mode: ChainMode): string => {
  const palette = mode === 'dot' ? DOT_COLORS : KSM_COLORS;

  return palette[index % palette.length] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length] ?? '#888';
};

export type SegmentData = {
  accountId: string;
  color: string;
  fraction: number;
  value: number;
};

export type MonthlyBarData = {
  month: string;
  year: number;
  label: string;
  tokenAmount: string;
  fiatAmount: string;
  rawTotal: number;
  isPeak: boolean;
  segments: SegmentData[];
  [accountId: string]: string | number | boolean | SegmentData[];
};

export type AccountInfo = {
  accountId: string;
  name: string;
  dataKey: string;
};

export type MonthlyRewardsChartData = {
  dotBars: MonthlyBarData[];
  ksmBars: MonthlyBarData[];
  dotAccounts: AccountInfo[];
  ksmAccounts: AccountInfo[];
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
  accountIds: string[],
  addressToId?: Map<string, string>,
): { bars: MonthlyBarData[]; activeAccounts: string[]; totalRaw: BigNumber } {
  const buckets = new Map<string, Map<string, BigNumber>>();

  for (const boundary of boundaries) {
    buckets.set(`${boundary.year}-${boundary.month}`, new Map());
  }

  const seenAccounts = new Set<string>();
  const addrCache = addressToId ?? new Map<string, string>();
  let totalRaw = new BigNumber(0);

  for (const record of records) {
    let normalizedId = addrCache.get(record.address);
    if (!normalizedId) {
      normalizedId = toAccountId(record.address);
      addrCache.set(record.address, normalizedId);
    }

    totalRaw = totalRaw.plus(record.amount);

    // Direct month calculation instead of O(records × 12) boundary iteration
    const date = new Date(record.timestamp * 1000);
    const key = `${date.getFullYear()}-${date.getMonth()}`;

    if (buckets.has(key)) {
      const monthBucket = buckets.get(key)!;
      const current = monthBucket.get(normalizedId) ?? new BigNumber(0);
      monthBucket.set(normalizedId, current.plus(record.amount));
      seenAccounts.add(normalizedId);
    }
  }

  const divisor = new BigNumber(10).pow(precision);
  const activeAccounts = accountIds.filter((id) => seenAccounts.has(id));

  const bars: MonthlyBarData[] = boundaries.map((boundary) => {
    const key = `${boundary.year}-${boundary.month}`;
    const monthBucket = buckets.get(key) ?? new Map<string, BigNumber>();

    let rawTotal = new BigNumber(0);
    const perAccount: Record<string, number> = {};

    for (const accountId of activeAccounts) {
      const amount = monthBucket.get(accountId) ?? new BigNumber(0);
      if (amount.isZero()) continue;
      const value = amount.dividedBy(divisor).toNumber();
      perAccount[accountId] = value;
      rawTotal = rawTotal.plus(amount);
    }

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
      rawTotal: rawTotal.dividedBy(divisor).toNumber(),
      isPeak: false,
      segments: [] as SegmentData[],
      ...perAccount,
    };
  });

  const maxAmount = Math.max(...bars.map((b) => b.rawTotal));
  if (maxAmount > 0) {
    const peakIndex = bars.findIndex((b) => b.rawTotal === maxAmount);
    if (peakIndex >= 0 && bars[peakIndex]) {
      bars[peakIndex] = { ...bars[peakIndex], isPeak: true };
    }
  }

  return { bars, activeAccounts, totalRaw };
}

function computeSegments(bars: MonthlyBarData[], accounts: AccountInfo[], mode: ChainMode): void {
  for (const bar of bars) {
    const segments: SegmentData[] = [];
    for (let i = 0; i < accounts.length; i++) {
      const val = bar[accounts[i]!.dataKey];
      if (typeof val === 'number' && val > 0 && bar.rawTotal > 0) {
        segments.push({
          accountId: accounts[i]!.accountId,
          color: getAccountColor(i, mode),
          fraction: val / bar.rawTotal,
          value: val,
        });
      }
    }
    bar.segments = segments;
  }
}

/**
 * @deprecated Superseded by `features/dashboard-staking-rewards-chart`.
 *   Reachable only from the deprecated `MonthlyRewardsWidget`.
 */
export const useMonthlyRewardsChart = (
  accountIds: string[],
  allEntries: { accountId: string; name: string }[],
): MonthlyRewardsChartData => {
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

  const nameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of allEntries) {
      map.set(entry.accountId, entry.name);
    }

    return map;
  }, [allEntries]);

  const result = useMemo(() => {
    const emptyTotal = { token: '0', fiat: '0', symbol: '', precision: 0 };

    const emptyResult = { bars: [] as MonthlyBarData[], accounts: [] as AccountInfo[], total: emptyTotal };

    const processChain = (chainId: ChainId, records: MonthlyRewardRecord[], mode: ChainMode) => {
      const chain = chains[chainId];
      if (!chain) return emptyResult;

      const asset = getRelaychainAsset(chain.assets);
      if (!asset?.priceId) return emptyResult;

      const priceItem = prices?.[asset.priceId]?.[currency?.coingeckoId ?? ''];
      const priceValue = priceItem?.price;

      // Build addressToId map once per record set — avoids duplicate toAccountId calls
      const addressToId = new Map<string, string>();
      for (const r of records) {
        if (!addressToId.has(r.address)) {
          addressToId.set(r.address, toAccountId(r.address));
        }
      }
      const normalizedIds = Array.from(new Set(addressToId.values()));

      const { bars, activeAccounts, totalRaw } = bucketRecords(
        records,
        boundaries,
        asset.precision,
        priceValue,
        currency?.symbol,
        normalizedIds,
        addressToId,
      );

      const accounts: AccountInfo[] = activeAccounts.map((id) => ({
        accountId: id,
        name: nameMap.get(id) ?? `${id.slice(0, 6)}…${id.slice(-4)}`,
        dataKey: id,
      }));

      computeSegments(bars, accounts, mode);

      const { formatted: tokenTotal, suffix } = formatBalance(totalRaw.toFixed(0), asset.precision);
      const tokenTotalDisplay = suffix ? `${tokenTotal}${suffix}` : tokenTotal;

      let fiatTotal = '0';
      if (priceValue !== undefined) {
        fiatTotal = totalRaw.isZero() ? '0' : getRoundedValue(totalRaw.toFixed(0), priceValue, asset.precision);
      }

      return {
        bars,
        accounts,
        total: { token: tokenTotalDisplay, fiat: fiatTotal, symbol: asset.symbol, precision: asset.precision },
      };
    };

    const dot = processChain(POLKADOT_AH_CHAIN_ID, dotRecords, 'dot');
    const ksm = processChain(KUSAMA_AH_CHAIN_ID, ksmRecords, 'ksm');

    return {
      dotBars: dot.bars,
      ksmBars: ksm.bars,
      dotAccounts: dot.accounts,
      ksmAccounts: ksm.accounts,
      dotTotal: dot.total,
      ksmTotal: ksm.total,
    };
  }, [chains, prices, currency, dotRecords, ksmRecords, boundaries, nameMap]);

  return {
    ...result,
    pending: accountIds.length > 0 && (dotPending || ksmPending),
    fiatFlag,
    currency,
  };
};
