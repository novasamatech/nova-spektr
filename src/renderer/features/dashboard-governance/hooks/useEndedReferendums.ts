import { type BN, BN_ZERO } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { useMemo, useRef } from 'react';

import { type AccountVote, type ChainId, type CompletedReferendum, type VotingMap } from '@/shared/core';
import { entries, getRoundedValue, toAccountId, toShortAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useReferendumTitles, useReferendums, useTracks, useVoting } from '@/domains/governance';
import { useBlock, useBlockTime } from '@/domains/network';
import { useAssetsPrices } from '@/domains/price';
import { AssetHubChains } from '@/domains/staking';
import { locksService, referendumService, votingService } from '@/entities/governance';
import { networkModel, useApi } from '@/entities/network';
import { currencySelect } from '@/aggregates/currency-select';
import { governanceMetaProvider } from '@/aggregates/governance-meta-provider';

import {
  type EntryInfo,
  type OurVote,
  type VoteDirection,
  formatConviction,
  getVoteDirection,
} from './useActiveReferendums';

const POLKADOT_AH_CHAIN_ID = AssetHubChains['POLKADOT_AH'];
const KUSAMA_AH_CHAIN_ID = AssetHubChains['KUSAMA_AH'];

export type EndedVote = OurVote & {
  unlockable: boolean;
  unlockAtMs: number | null;
};

export type EndedReferendum = {
  id: string;
  chainId: ChainId;
  chainName: string;
  chainIcon: string;
  trackId: number;
  title: string;
  outcome: 'Approved' | 'Rejected' | 'Cancelled' | 'TimedOut' | 'Killed';
  endedAtMs: number;
  unlockableAmount: string;
  unlockableAmountFiat: string;
  totalLockedAmount: string;
  totalLockedAmountFiat: string;
  addressesWithLocks: number;
  symbol: string;
  precision: number;
  ourVotes: EndedVote[];
};

function getVoteLockExpiry(vote: AccountVote, referendum: CompletedReferendum, voteLockingPeriod: number): number {
  if (referendum.type === 'TimedOut' || referendum.type === 'Killed' || referendum.type === 'Cancelled') {
    return referendum.since;
  }

  const outcome: VoteDirection = referendum.type === 'Approved' ? 'aye' : 'nay';

  if (votingService.isStandardVote(vote) && vote.vote.aye === (outcome === 'aye')) {
    const multiplier = locksService.getLockPeriodsMultiplier(vote.vote.conviction);

    return referendum.since + voteLockingPeriod * multiplier;
  }

  return referendum.since;
}

type GroupedEntry = {
  referendum: CompletedReferendum;
  trackId: number;
  votes: EndedVote[];
  totalLocked: BN;
  unlockableTotal: BN;
  accountIds: Set<string>;
};

function useChainEndedReferendums(
  chainId: ChainId,
  typedAccountIds: AccountId[],
  entryMap: Map<string, EntryInfo>,
  prices: Record<string, Record<string, { price: number }>>,
  currencyCode: string | null,
) {
  const chains = useUnit(networkModel.$chains);
  const metaProvider = useUnit(governanceMetaProvider.$metaProvider);
  const api = useApi(chainId);

  const { data: tracks, pending: tracksPending } = useTracks({ api });
  const trackIds = useMemo(() => Object.keys(tracks), [tracks]);

  const { data: rawVotingMap, pending: votingPending } = useVoting({
    api,
    tracks: trackIds.length > 0 ? trackIds : null,
    accounts: typedAccountIds,
  });

  const votingMap = useMemo(() => {
    const accountSet = new Set<AccountId>(typedAccountIds);
    const filtered: VotingMap = {};

    for (const [accountId, trackVoting] of entries(rawVotingMap)) {
      if (accountSet.has(accountId)) {
        filtered[accountId] = trackVoting;
      }
    }

    return filtered;
  }, [rawVotingMap, typedAccountIds]);

  const { data: referendums } = useReferendums({ api });

  const chain = chains[chainId] ?? null;
  const timelineChainId = chain?.additional?.timelineChain ?? chainId;
  const timelineApi = useApi(timelineChainId);
  const { data: currentBlock } = useBlock(timelineApi);
  const { data: blockTime } = useBlockTime(timelineApi);
  const { data: titles } = useReferendumTitles({
    chain,
    service: metaProvider?.service ?? null,
  });

  const asset = chain ? votingService.getVotingAsset(chain) : null;
  const priceItem = asset?.priceId && currencyCode ? prices[asset.priceId]?.[currencyCode] : null;

  const hasEverLoaded = useRef(false);
  if (api && !tracksPending && !votingPending) {
    hasEverLoaded.current = true;
  }

  const data = useMemo((): EndedReferendum[] => {
    if (!chain || !asset || !api || currentBlock === null || blockTime === null) return [];

    const blockTimeMs = blockTime.toNumber();
    const voteLockingPeriod = api.consts.convictionVoting.voteLockingPeriod.toNumber();

    const refMap = new Map(referendums.map((r) => [r.referendumId, r]));

    const grouped = new Map<string, GroupedEntry>();
    const now = Date.now();

    for (const [accountId, trackVoting] of entries(votingMap)) {
      for (const [trackId, voting] of Object.entries(trackVoting)) {
        if (!votingService.isCasting(voting)) continue;

        for (const [refId, vote] of Object.entries(voting.votes)) {
          const ref = refMap.get(refId);
          if (!ref || !referendumService.isCompleted(ref)) continue;

          const completedRef = ref;
          const lockExpiry = getVoteLockExpiry(vote, completedRef, voteLockingPeriod);
          const unlockable = currentBlock >= lockExpiry;

          const unlockAtMs = unlockable ? null : now + (lockExpiry - currentBlock) * blockTimeMs;

          const entry = entryMap.get(accountId);
          const amount = votingService.calculateAccountVoteAmount(vote);

          const endedVote: EndedVote = {
            accountId,
            name: entry?.name ?? toShortAddress(entry?.address ?? accountId),
            address: entry?.address ?? accountId,
            direction: getVoteDirection(vote),
            amount: amount.toString(),
            amountFiat: priceItem ? getRoundedValue(amount.toString(), priceItem.price, asset.precision) : '0',
            conviction: formatConviction(vote),
            symbol: asset.symbol,
            precision: asset.precision,
            unlockable,
            unlockAtMs,
          };

          const existing = grouped.get(refId);
          if (existing) {
            existing.votes.push(endedVote);
            existing.totalLocked = existing.totalLocked.add(amount);
            if (unlockable) {
              existing.unlockableTotal = existing.unlockableTotal.add(amount);
            }
            existing.accountIds.add(accountId);
          } else {
            grouped.set(refId, {
              referendum: completedRef,
              trackId: Number(trackId),
              votes: [endedVote],
              totalLocked: amount,
              unlockableTotal: unlockable ? amount : BN_ZERO,
              accountIds: new Set([accountId]),
            });
          }
        }
      }
    }

    const result: EndedReferendum[] = [];

    for (const [refId, { referendum, trackId, votes, totalLocked, unlockableTotal, accountIds }] of grouped) {
      const endedAtMs = now - (currentBlock - referendum.since) * blockTimeMs;
      const title = titles[refId] ?? `Referendum #${refId}`;

      result.push({
        id: refId,
        chainId,
        chainName: chain.name,
        chainIcon: asset.icon.colored,
        trackId,
        title,
        outcome: referendum.type,
        endedAtMs,
        unlockableAmount: unlockableTotal.toString(),
        unlockableAmountFiat: priceItem
          ? getRoundedValue(unlockableTotal.toString(), priceItem.price, asset.precision)
          : '0',
        totalLockedAmount: totalLocked.toString(),
        totalLockedAmountFiat: priceItem
          ? getRoundedValue(totalLocked.toString(), priceItem.price, asset.precision)
          : '0',
        addressesWithLocks: accountIds.size,
        symbol: asset.symbol,
        precision: asset.precision,
        ourVotes: votes,
      });
    }

    return result.sort((a, b) => b.endedAtMs - a.endedAtMs);
  }, [chain, asset, api, currentBlock, blockTime, referendums, votingMap, titles, entryMap, priceItem, chainId]);

  return {
    data,
    pending: typedAccountIds.length > 0 && !hasEverLoaded.current,
  };
}

type AllEntry = { accountId: string; name: string; address: string };

export const useEndedReferendums = (accountIds: string[], allEntries: AllEntry[]) => {
  const fiatFlag = useUnit(currencySelect.$fiatFlag);
  const currency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);

  const accountIdsKey = accountIds.join(',');
  const typedAccountIds = useMemo(() => accountIds.map((id) => toAccountId(id)), [accountIdsKey]);

  const entriesKey = useMemo(() => allEntries.map((e) => e.accountId).join(','), [allEntries]);
  const entryMap = useMemo(() => {
    const map = new Map<string, EntryInfo>();
    for (const entry of allEntries) {
      map.set(entry.accountId, { name: entry.name, address: entry.address });
    }

    return map;
  }, [entriesKey]);

  const currencyCode = currency?.coingeckoId ?? null;

  const polkadotRefs = useChainEndedReferendums(POLKADOT_AH_CHAIN_ID, typedAccountIds, entryMap, prices, currencyCode);
  const kusamaRefs = useChainEndedReferendums(KUSAMA_AH_CHAIN_ID, typedAccountIds, entryMap, prices, currencyCode);

  const referendums = useMemo(
    () => [...polkadotRefs.data, ...kusamaRefs.data].sort((a, b) => b.endedAtMs - a.endedAtMs),
    [polkadotRefs.data, kusamaRefs.data],
  );

  return {
    referendums,
    pending: polkadotRefs.pending || kusamaRefs.pending,
    fiatFlag,
  };
};
