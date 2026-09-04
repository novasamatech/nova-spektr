import { BN_ZERO } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { useMemo, useRef } from 'react';

import { type AccountVote, type ChainId, type VotingMap } from '@/shared/core';
import { entries, getRoundedValue, toShortAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useReferendumTitles, useReferendums, useTracks, useUndecidingTimeout, useVoting } from '@/domains/governance';
import { useBlockTime } from '@/domains/network';
import { useAssetsPrices } from '@/domains/price';
import { referendumService, votingService } from '@/entities/governance';
import { networkModel, useApi } from '@/entities/network';
import { currencySelect } from '@/aggregates/currency-select';
import { governanceMetaProvider } from '@/aggregates/governance-meta-provider';
import { KUSAMA_AH_CHAIN_ID, POLKADOT_AH_CHAIN_ID } from '../lib/constants';
import { toSubstrateAccountIds } from '../lib/substrateAccountIds';

import { useThrottledBlock } from './useThrottledBlock';

export type VoteDirection = 'aye' | 'nay' | 'abstain' | 'split';

export type OurVote = {
  accountId: string;
  name: string;
  address: string;
  direction: VoteDirection;
  amount: string;
  amountFiat: string;
  conviction: string;
  symbol: string;
  precision: number;
};

export type ActiveReferendum = {
  id: string;
  idNumeric: number;
  chainId: ChainId;
  chainName: string;
  chainIcon: string;
  trackId: number;
  title: string;
  timeLeftMs: number;
  totalAye: string;
  totalNay: string;
  totalLocked: string;
  totalLockedFiat: string;
  symbol: string;
  precision: number;
  ayePercent: number;
  ourVotes: OurVote[];
};

export function getVoteDirection(vote: AccountVote): VoteDirection {
  if (votingService.isStandardVote(vote)) {
    return vote.vote.aye ? 'aye' : 'nay';
  }
  if (votingService.isSplitVote(vote)) return 'split';

  return 'abstain';
}

export function formatConviction(vote: AccountVote): string {
  const conviction = votingService.getAccountVoteConviction(vote);
  const multiplier = votingService.getConvictionMultiplier(conviction);

  return multiplier < 1 ? 'None' : `${multiplier}x`;
}

export type EntryInfo = { name: string; address: string };

function useChainActiveReferendums(
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
    accounts: typedAccountIds.length > 0 ? typedAccountIds : null,
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
  const { data: undecidingTimeout } = useUndecidingTimeout({ api });

  const chain = chains[chainId] ?? null;
  const timelineChainId = chain?.additional?.timelineChain ?? chainId;
  const timelineApi = useApi(timelineChainId);
  const { snapshot: currentBlock } = useThrottledBlock(timelineApi, timelineChainId);
  // Block time is a per-chain constant (the resource never goes stale).
  const blockTime = useBlockTime(timelineApi, chains[timelineChainId]).data;
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

  const data = useMemo((): ActiveReferendum[] => {
    if (!chain || !asset || currentBlock === null || blockTime === null) return [];

    const blockTimeMs = blockTime.toNumber();
    const result: ActiveReferendum[] = [];

    for (const ref of referendums) {
      if (!referendumService.isOngoing(ref)) continue;

      const track = tracks[ref.track];
      if (!track) continue;

      const endBlock = referendumService.getReferendumEndTime(ref, track, undecidingTimeout);
      const timeLeftMs = Math.max(0, (endBlock - currentBlock) * blockTimeMs);

      const title = titles[ref.referendumId] ?? `Referendum #${ref.referendumId}`;

      const accountVotes = votingService.getReferendumAccountVotes(ref.referendumId, votingMap);

      const ourVotes: OurVote[] = [];
      for (const [accountId, vote] of entries(accountVotes)) {
        const entry = entryMap.get(accountId);
        const amount = votingService.calculateAccountVoteAmount(vote);

        ourVotes.push({
          accountId,
          name: entry?.name ?? toShortAddress(entry?.address ?? accountId),
          address: entry?.address ?? accountId,
          direction: getVoteDirection(vote),
          amount: amount.toString(),
          amountFiat: priceItem ? getRoundedValue(amount.toString(), priceItem.price, asset.precision) : '0',
          conviction: formatConviction(vote),
          symbol: asset.symbol,
          precision: asset.precision,
        });
      }

      const totalLocked = ref.tally.ayes.add(ref.tally.nays);
      const ayePercent = totalLocked.gt(BN_ZERO) ? ref.tally.ayes.muln(100).div(totalLocked).toNumber() / 100 : 0;

      result.push({
        id: ref.referendumId,
        idNumeric: Number(ref.referendumId),
        chainId,
        chainName: chain.name,
        chainIcon: asset.icon.colored,
        trackId: Number(ref.track),
        title,
        timeLeftMs,
        totalAye: ref.tally.ayes.toString(),
        totalNay: ref.tally.nays.toString(),
        totalLocked: totalLocked.toString(),
        totalLockedFiat: priceItem ? getRoundedValue(totalLocked.toString(), priceItem.price, asset.precision) : '0',
        symbol: asset.symbol,
        precision: asset.precision,
        ayePercent,
        ourVotes,
      });
    }

    return result;
  }, [
    chain,
    asset,
    currentBlock,
    blockTime,
    referendums,
    tracks,
    undecidingTimeout,
    titles,
    votingMap,
    entryMap,
    priceItem,
    chainId,
  ]);

  return {
    data,
    pending: typedAccountIds.length > 0 && !hasEverLoaded.current,
  };
}

export type AllEntry = { accountId: string; name: string; address: string };

export const useActiveReferendums = (accountIds: string[], allEntries: AllEntry[]) => {
  const fiatFlag = useUnit(currencySelect.$fiatFlag);
  const currency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);

  const accountIdsKey = accountIds.join(',');
  const typedAccountIds = useMemo(() => toSubstrateAccountIds(accountIds), [accountIdsKey]);

  const entryMap = useMemo(() => {
    const map = new Map<string, EntryInfo>();
    for (const entry of allEntries) {
      map.set(entry.accountId, { name: entry.name, address: entry.address });
    }

    return map;
  }, [allEntries]);

  const currencyCode = currency?.coingeckoId ?? null;

  const polkadotRefs = useChainActiveReferendums(POLKADOT_AH_CHAIN_ID, typedAccountIds, entryMap, prices, currencyCode);
  const kusamaRefs = useChainActiveReferendums(KUSAMA_AH_CHAIN_ID, typedAccountIds, entryMap, prices, currencyCode);

  const referendums = useMemo(
    () => [...polkadotRefs.data, ...kusamaRefs.data].sort((a, b) => a.timeLeftMs - b.timeLeftMs),
    [polkadotRefs.data, kusamaRefs.data],
  );

  return {
    referendums,
    pending: polkadotRefs.pending || kusamaRefs.pending,
    fiatFlag,
  };
};
