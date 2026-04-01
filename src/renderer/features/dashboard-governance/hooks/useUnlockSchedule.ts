import { BN, BN_ZERO } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { getRoundedValue } from '@/shared/lib/utils';
import { type CurrencyItem, useAssetsPrices } from '@/domains/price';
import { currencySelect } from '@/aggregates/currency-select';

import { KUSAMA_AH_CHAIN_ID, POLKADOT_AH_CHAIN_ID } from './constants';
import { type AccountUnlockChunk, type ChainGovernanceData, useChainGovernanceData } from './useChainGovernanceData';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type UnlockEvent = {
  unlockAtMs: number;
  amount: string;
  amountFiat: string;
  symbol: string;
  precision: number;
  chainName: string;
  chainIcon: string;
  accountIds: string[];
  tracks: string[];
};

export type AccountUnlockRow = {
  accountId: string;
  amount: string;
  amountFiat: string;
  fiatValueNum: number;
  symbol: string;
  precision: number;
  chainName: string;
  chainIcon: string;
};

export type UnlockScheduleData = {
  totalLockedFiat: string | null;
  claimableNowFiat: string | null;
  pendingLocksFiat: string | null;
  delegatedFiat: string | null;
  claimableRows: AccountUnlockRow[];
  pendingRows: AccountUnlockRow[];
  events: UnlockEvent[];
  pending: boolean;
  fiatFlag: boolean | null;
  currency: CurrencyItem | null;
};

type AggregateResult = {
  events: UnlockEvent[];
  pendingFiat: BigNumber;
  pendingByAccount: Map<string, BN>;
};

function aggregatePendingChunks(
  chunks: AccountUnlockChunk[],
  data: ChainGovernanceData,
  now: number,
  toFiat: (amount: string) => string,
): AggregateResult {
  const pendingByAccount = new Map<string, BN>();
  let pendingFiat = new BigNumber(0);

  if (data.blockTimeMs === null || data.currentBlock === null) {
    for (const chunk of chunks) {
      if (chunk.type !== 'pending_lock') continue;
      const amountBN = new BN(chunk.amount);
      pendingFiat = pendingFiat.plus(toFiat(chunk.amount));
      pendingByAccount.set(chunk.accountId, (pendingByAccount.get(chunk.accountId) ?? BN_ZERO).add(amountBN));
    }

    return { events: [], pendingFiat, pendingByAccount };
  }

  const dayGroups = new Map<number, { amount: BN; accountIds: Set<string>; tracks: Set<string> }>();

  for (const chunk of chunks) {
    if (chunk.type !== 'pending_lock') continue;

    const amountBN = new BN(chunk.amount);
    pendingFiat = pendingFiat.plus(toFiat(chunk.amount));
    pendingByAccount.set(chunk.accountId, (pendingByAccount.get(chunk.accountId) ?? BN_ZERO).add(amountBN));

    const unlockAtMs = now + (chunk.block - data.currentBlock) * data.blockTimeMs;
    const dayKey = Math.floor(unlockAtMs / MS_PER_DAY);

    const group = dayGroups.get(dayKey) ?? { amount: BN_ZERO, accountIds: new Set(), tracks: new Set() };
    group.amount = group.amount.add(amountBN);
    group.accountIds.add(chunk.accountId);
    for (const t of chunk.tracks) {
      group.tracks.add(t);
    }
    dayGroups.set(dayKey, group);
  }

  const events: UnlockEvent[] = Array.from(dayGroups.entries())
    .sort(([a], [b]) => a - b)
    .filter(([, group]) => !group.amount.isZero())
    .map(([dayKey, group]) => {
      const amountStr = group.amount.toString();

      return {
        unlockAtMs: dayKey * MS_PER_DAY + MS_PER_DAY / 2,
        amount: amountStr,
        amountFiat: toFiat(amountStr),
        symbol: data.symbol,
        precision: data.precision,
        chainName: data.chainName,
        chainIcon: data.icon.colored,
        accountIds: Array.from(group.accountIds),
        tracks: Array.from(group.tracks),
      };
    });

  return { events, pendingFiat, pendingByAccount };
}

export const useUnlockSchedule = (accountIds: string[]): UnlockScheduleData => {
  const fiatFlag = useUnit(currencySelect.$fiatFlag);
  const currency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);

  const polkadotData = useChainGovernanceData(POLKADOT_AH_CHAIN_ID, accountIds);
  const kusamaData = useChainGovernanceData(KUSAMA_AH_CHAIN_ID, accountIds);

  const result = useMemo(() => {
    if (!prices || !currency) {
      return {
        totalLockedFiat: null,
        claimableNowFiat: null,
        pendingLocksFiat: null,
        delegatedFiat: null,
        claimableRows: [],
        pendingRows: [],
        events: [],
      };
    }

    const chainEntries = [{ data: polkadotData }, { data: kusamaData }] as const;

    let grandTotalLocked = new BigNumber(0);
    let grandClaimable = new BigNumber(0);
    let grandPending = new BigNumber(0);
    let grandDelegated = new BigNumber(0);
    const allEvents: UnlockEvent[] = [];
    const allClaimableRows: AccountUnlockRow[] = [];
    const allPendingRows: AccountUnlockRow[] = [];
    const now = Date.now();

    for (const { data } of chainEntries) {
      if (!data || data.activeVotingAccounts === 0) continue;

      const priceItem = prices[data.priceId]?.[currency.coingeckoId];
      const toFiat = (amount: string) => (priceItem ? getRoundedValue(amount, priceItem.price, data.precision) : '0');

      grandTotalLocked = grandTotalLocked.plus(toFiat(data.totalLocked));
      grandClaimable = grandClaimable.plus(toFiat(data.claimableAmount));
      grandDelegated = grandDelegated.plus(toFiat(data.delegatedAmount));

      const toRow = (accountId: string, amount: string): AccountUnlockRow => {
        const fiat = toFiat(amount);

        return {
          accountId,
          amount,
          amountFiat: fiat,
          fiatValueNum: parseFloat(fiat) || 0,
          symbol: data.symbol,
          precision: data.precision,
          chainName: data.chainName,
          chainIcon: data.icon.colored,
        };
      };

      for (const [accountId, amount] of Object.entries(data.claimableByAccount)) {
        allClaimableRows.push(toRow(accountId, amount));
      }

      const { events, pendingFiat, pendingByAccount } = aggregatePendingChunks(data.unlockChunks, data, now, toFiat);
      grandPending = grandPending.plus(pendingFiat);
      allEvents.push(...events);

      for (const [accountId, amount] of pendingByAccount.entries()) {
        allPendingRows.push(toRow(accountId, amount.toString()));
      }
    }

    allEvents.sort((a, b) => a.unlockAtMs - b.unlockAtMs);
    allClaimableRows.sort((a, b) => b.fiatValueNum - a.fiatValueNum);
    allPendingRows.sort((a, b) => b.fiatValueNum - a.fiatValueNum);

    return {
      totalLockedFiat: grandTotalLocked.toString(),
      claimableNowFiat: grandClaimable.toString(),
      pendingLocksFiat: grandPending.toString(),
      delegatedFiat: grandDelegated.toString(),
      claimableRows: allClaimableRows,
      pendingRows: allPendingRows,
      events: allEvents,
    };
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
