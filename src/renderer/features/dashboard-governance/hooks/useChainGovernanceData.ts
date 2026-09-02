import { BN, BN_ZERO } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';
import { useStoreMap, useUnit } from 'effector-react';
import { useMemo, useRef } from 'react';

import { UnlockChunkType } from '@/shared/api/governance';
import { type ChainId, type Referendum, type TrackId, type TrackInfo, type VotingMap } from '@/shared/core';
import { useThrottledSnapshot } from '@/shared/lib/hooks';
import { entries } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  $referendumsFullyLoaded,
  useReferendums,
  useTrackLocks,
  useTracks,
  useUndecidingTimeout,
  useVoting,
} from '@/domains/governance';
import { useBlock, useBlockTime } from '@/domains/network';
import { votingService } from '@/entities/governance';
import { networkModel, useApi } from '@/entities/network';
import { toSubstrateAccountIds } from '../lib/substrateAccountIds';
import { type AccountLockSummary, getLockedAmount, summarizeAccountLocks } from '../lib/summarizeAccountLocks';

import { EMPTY_TRACK_LOCKS, cachedEstimateClaimSchedule } from './claimScheduleCache';

type ClaimResult = {
  claimable: BN;
  locksByAccount: Record<string, AccountLockSummary>;
};
const EMPTY_CLAIM: ClaimResult = {
  claimable: BN_ZERO,
  locksByAccount: {},
};

export type ChainGovernanceData = {
  activeVotingAccounts: number;
  totalLocked: string;
  claimableAmount: string;
  averageConviction: number;
  blockTimeMs: number | null;
  currentBlock: number | null;
  chainId: ChainId;
  chainName: string;
  symbol: string;
  precision: number;
  icon: { monochrome: string; colored: string };
  priceId: string;
  pending: boolean;
  votingMap: VotingMap;
  tracks: Record<string, TrackInfo>;
  /** Per selected account with governance activity on this chain. */
  locksByAccount: Record<string, AccountLockSummary>;
  /** Inputs a caller needs to re-run the claim schedule against the live head. */
  scheduleInputs: {
    referendums: Referendum[];
    trackLocks: Record<string, Record<TrackId, BN>>;
    undecidingTimeout: number;
    voteLockingPeriod: number;
  } | null;
  /** Unthrottled head — `currentBlock` is a 5-minute snapshot. */
  liveBlock: number | null;
};

function computeGovernanceStats(votingMap: VotingMap) {
  let activeVotingAccounts = 0;
  let totalLocked = new BN(0);
  let totalWeight = new BigNumber(0);
  let weightedConvictionSum = new BigNumber(0);
  const maxLockByAccount: Record<string, BN> = {};

  for (const [accountId, trackVoting] of Object.entries(votingMap)) {
    let accountMaxLock = new BN(0);
    let hasActivity = false;

    for (const [, voting] of Object.entries(trackVoting)) {
      if (votingService.isCasting(voting)) {
        const voteEntries = Object.values(voting.votes);
        if (voteEntries.length > 0) {
          hasActivity = true;
        }

        for (const vote of voteEntries) {
          const amount = votingService.calculateAccountVoteAmount(vote);
          if (amount.gt(accountMaxLock)) {
            accountMaxLock = amount;
          }
          const conviction = votingService.getAccountVoteConviction(vote);
          const multiplier = votingService.getConvictionMultiplier(conviction);
          const weight = new BigNumber(amount.toString());
          totalWeight = totalWeight.plus(weight);
          weightedConvictionSum = weightedConvictionSum.plus(weight.times(multiplier));
        }

        if (voting.prior && voting.prior.amount && !voting.prior.amount.isZero()) {
          hasActivity = true;
          if (voting.prior.amount.gt(accountMaxLock)) {
            accountMaxLock = voting.prior.amount;
          }
        }
      } else if (votingService.isDelegating(voting)) {
        hasActivity = true;
        if (voting.balance.gt(accountMaxLock)) {
          accountMaxLock = voting.balance;
        }
        if (voting.prior && voting.prior.amount && voting.prior.amount.gt(accountMaxLock)) {
          accountMaxLock = voting.prior.amount;
        }
        const multiplier = votingService.getConvictionMultiplier(voting.conviction);
        const weight = new BigNumber(voting.balance.toString());
        totalWeight = totalWeight.plus(weight);
        weightedConvictionSum = weightedConvictionSum.plus(weight.times(multiplier));
      }
    }

    if (hasActivity) {
      activeVotingAccounts++;
      maxLockByAccount[accountId] = accountMaxLock;
    }
    totalLocked = totalLocked.add(accountMaxLock);
  }

  const averageConviction = totalWeight.gt(0) ? weightedConvictionSum.div(totalWeight).toNumber() : 0;

  return { activeVotingAccounts, totalLocked, averageConviction, maxLockByAccount };
}

export const useChainGovernanceData = (chainId: ChainId, accountIds: string[]) => {
  const chains = useUnit(networkModel.$chains);
  const api = useApi(chainId);

  const accountIdsKey = accountIds.join(',');
  const typedAccountIds = useMemo(() => toSubstrateAccountIds(accountIds), [accountIdsKey]);

  const { data: tracks, pending: tracksPending } = useTracks({ api });
  const trackIds = useMemo(() => Object.keys(tracks), [tracks]);

  const { data: rawVotingMap, pending: votingPending } = useVoting({
    api,
    tracks: trackIds.length > 0 ? trackIds : null,
    accounts: typedAccountIds.length > 0 ? typedAccountIds : null,
  });

  // The subscription cache may retain data from previously selected accounts.
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
  const genesisHash = api?.genesisHash.toHex() ?? null;
  const referendumsFullyLoaded = useStoreMap({
    store: $referendumsFullyLoaded,
    keys: [genesisHash],
    fn: (state, [key]) => (key ? (state[key] ?? false) : false),
  });
  const { data: undecidingTimeout } = useUndecidingTimeout({ api });

  const { data: trackLocks } = useTrackLocks({
    api,
    accounts: typedAccountIds.length > 0 ? typedAccountIds : null,
  });

  const liveBlock = useBlock(api).data;
  const currentBlock = useThrottledSnapshot(liveBlock, 300_000);
  const blockTime = useThrottledSnapshot(useBlockTime(api, chains[chainId]).data, 300_000);

  const stats = useMemo(() => computeGovernanceStats(votingMap), [votingMap]);

  const claimData = useMemo(() => {
    if (
      !api ||
      currentBlock === null ||
      typedAccountIds.length === 0 ||
      Object.keys(votingMap).length === 0 ||
      referendums.length === 0 ||
      Object.keys(tracks).length === 0 ||
      !referendumsFullyLoaded
    ) {
      return EMPTY_CLAIM;
    }

    const voteLockingPeriod = api.consts.convictionVoting.voteLockingPeriod.toNumber();
    let totalClaimable = BN_ZERO;
    const locksByAccount: Record<string, AccountLockSummary> = {};

    for (const accountId of typedAccountIds) {
      const votingByTrack = votingMap[accountId];
      if (!votingByTrack) continue;

      const accountTrackLocks = trackLocks[accountId] ?? EMPTY_TRACK_LOCKS;

      const schedule = cachedEstimateClaimSchedule(
        accountId,
        {
          currentBlockNumber: currentBlock,
          referendums,
          tracks,
          trackLocks: accountTrackLocks,
          votingByTrack,
          undecidingTimeout,
          voteLockingPeriod,
        },
        votingByTrack,
        accountTrackLocks,
        referendums,
      );

      locksByAccount[accountId] = summarizeAccountLocks(
        schedule,
        getLockedAmount(stats.maxLockByAccount[accountId] ?? BN_ZERO, accountTrackLocks),
      );

      for (const chunk of schedule) {
        if (chunk.type === UnlockChunkType.CLAIMABLE && !chunk.amount.isZero()) {
          totalClaimable = totalClaimable.add(chunk.amount);
        }
      }
    }

    return {
      claimable: totalClaimable,
      locksByAccount,
    };
  }, [
    api,
    currentBlock,
    typedAccountIds,
    votingMap,
    referendums,
    tracks,
    trackLocks,
    undecidingTimeout,
    referendumsFullyLoaded,
    stats,
  ]);

  const scheduleInputs = useMemo(() => {
    if (!api || !referendumsFullyLoaded || Object.keys(tracks).length === 0 || referendums.length === 0) {
      return null;
    }

    return {
      referendums,
      trackLocks,
      undecidingTimeout,
      voteLockingPeriod: api.consts.convictionVoting.voteLockingPeriod.toNumber(),
    };
  }, [api, referendumsFullyLoaded, tracks, referendums, trackLocks, undecidingTimeout]);

  // Sticky pending — only show skeleton on initial load, not on account changes.
  // Flip when pending states resolve (not when data appears), so accounts with
  // no governance activity don't get stuck in skeleton.
  const hasEverLoaded = useRef(false);
  if (api && !tracksPending && !votingPending && currentBlock !== null && referendumsFullyLoaded) {
    hasEverLoaded.current = true;
  }

  const chain = chains[chainId];
  const asset = chain ? votingService.getVotingAsset(chain) : null;
  const pending = accountIds.length > 0 && !hasEverLoaded.current;

  if (!chain || !asset?.priceId) {
    return null;
  }

  return {
    activeVotingAccounts: stats.activeVotingAccounts,
    totalLocked: stats.totalLocked.toString(),
    claimableAmount: claimData.claimable.toString(),
    averageConviction: stats.averageConviction,
    blockTimeMs: blockTime?.toNumber() ?? null,
    currentBlock,
    chainId,
    chainName: chain.name,
    symbol: asset.symbol,
    precision: asset.precision,
    icon: asset.icon,
    priceId: asset.priceId,
    pending,
    votingMap,
    tracks,
    locksByAccount: claimData.locksByAccount,
    liveBlock: liveBlock ?? null,
    scheduleInputs,
  } satisfies ChainGovernanceData;
};
