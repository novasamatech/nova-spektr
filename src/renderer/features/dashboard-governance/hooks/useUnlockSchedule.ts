import { BN } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { getRoundedValue } from '@/shared/lib/utils';
import { type CurrencyItem, useAssetsPrices } from '@/domains/price';
import { AssetHubChains } from '@/domains/staking';
import { currencySelect } from '@/aggregates/currency-select';

import { type AccountUnlockChunk, type ChainGovernanceData, useChainGovernanceData } from './useChainGovernanceData';

const POLKADOT_AH_CHAIN_ID = AssetHubChains['POLKADOT_AH'];
const KUSAMA_AH_CHAIN_ID = AssetHubChains['KUSAMA_AH'];

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

export type UnlockScheduleData = {
  totalLockedFiat: string | null;
  claimableNowFiat: string | null;
  pendingLocksFiat: string | null;
  delegatedFiat: string | null;
  events: UnlockEvent[];
  pending: boolean;
  fiatFlag: boolean | null;
  currency: CurrencyItem | null;
};

/**
 * Groups pending locks that fall on the same calendar day (per chain) into a
 * single event, summing their amounts and merging accountIds/tracks.
 */
function aggregateEventsByDay(
  chunks: AccountUnlockChunk[],
  data: ChainGovernanceData,
  now: number,
  toFiat: (amount: string) => string,
): { events: UnlockEvent[]; pendingFiat: BigNumber } {
  if (data.blockTimeMs === null || data.currentBlock === null) {
    let pendingFiat = new BigNumber(0);
    for (const chunk of chunks) {
      if (chunk.type === 'pending_lock') {
        pendingFiat = pendingFiat.plus(toFiat(chunk.amount));
      }
    }

    return { events: [], pendingFiat };
  }

  const dayGroups = new Map<number, { amount: BN; accountIds: Set<string>; tracks: Set<string> }>();
  let pendingFiat = new BigNumber(0);

  for (const chunk of chunks) {
    if (chunk.type !== 'pending_lock') continue;

    pendingFiat = pendingFiat.plus(toFiat(chunk.amount));

    const unlockAtMs = now + (chunk.block - data.currentBlock) * data.blockTimeMs;
    const dayKey = Math.floor(unlockAtMs / MS_PER_DAY);

    const group = dayGroups.get(dayKey) ?? { amount: new BN(0), accountIds: new Set(), tracks: new Set() };
    group.amount = group.amount.add(new BN(chunk.amount));
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

  return { events, pendingFiat };
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
        events: [],
      };
    }

    const chainEntries = [{ data: polkadotData }, { data: kusamaData }] as const;

    let grandTotalLocked = new BigNumber(0);
    let grandClaimable = new BigNumber(0);
    let grandPending = new BigNumber(0);
    let grandDelegated = new BigNumber(0);
    const allEvents: UnlockEvent[] = [];
    const now = Date.now();

    for (const { data } of chainEntries) {
      if (!data || data.activeVotingAccounts === 0) continue;

      const priceItem = prices[data.priceId]?.[currency.coingeckoId];
      const toFiat = (amount: string) => (priceItem ? getRoundedValue(amount, priceItem.price, data.precision) : '0');

      grandTotalLocked = grandTotalLocked.plus(toFiat(data.totalLocked));
      grandClaimable = grandClaimable.plus(toFiat(data.claimableAmount));
      grandDelegated = grandDelegated.plus(toFiat(data.delegatedAmount));

      const { events, pendingFiat } = aggregateEventsByDay(data.unlockChunks, data, now, toFiat);
      grandPending = grandPending.plus(pendingFiat);
      allEvents.push(...events);
    }

    allEvents.sort((a, b) => a.unlockAtMs - b.unlockAtMs);

    return {
      totalLockedFiat: grandTotalLocked.toString(),
      claimableNowFiat: grandClaimable.toString(),
      pendingLocksFiat: grandPending.toString(),
      delegatedFiat: grandDelegated.toString(),
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
