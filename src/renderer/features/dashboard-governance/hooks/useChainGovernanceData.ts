import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { useMemo, useRef } from 'react';

import { type Chunks, UnlockChunkType } from '@/shared/api/governance';
import { type ChainId, type VotingMap } from '@/shared/core';
import { useSnapshot } from '@/shared/lib/hooks';
import { entries, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useReferendums, useTrackLocks, useTracks, useUndecidingTimeout, useVoting } from '@/domains/governance';
import { useBlock, useBlockTime } from '@/domains/network';
import { locksService, votingService } from '@/entities/governance';
import { networkModel, useApi } from '@/entities/network';

import { cachedEstimateClaimSchedule } from './claimScheduleCache';

const BN_ZERO = new BN(0);
const EMPTY_VOTING_MAP: VotingMap = {};

type ClaimResult = { claimable: BN; unlockChunks: AccountUnlockChunk[]; delegated: BN };
const EMPTY_CLAIM: ClaimResult = { claimable: BN_ZERO, unlockChunks: [], delegated: BN_ZERO };

export type AccountUnlockChunk = {
  accountId: string;
  block: number;
  amount: string;
  tracks: string[];
  type: 'pending_lock' | 'pending_delegation';
};

export type ChainGovernanceData = {
  activeVotingAccounts: number;
  totalLocked: string;
  claimableAmount: string;
  averageConviction: number;
  unlockChunks: AccountUnlockChunk[];
  delegatedAmount: string;
  blockTimeMs: number | null;
  currentBlock: number | null;
  chainName: string;
  symbol: string;
  precision: number;
  icon: { monochrome: string; colored: string };
  priceId: string;
  pending: boolean;
};

function computeGovernanceStats(votingMap: VotingMap) {
  let activeVotingAccounts = 0;
  let totalLocked = new BN(0);
  const multipliers: number[] = [];

  for (const [, trackVoting] of Object.entries(votingMap)) {
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
          multipliers.push(votingService.getConvictionMultiplier(conviction));
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
        multipliers.push(votingService.getConvictionMultiplier(voting.conviction));
      }
    }

    if (hasActivity) {
      activeVotingAccounts++;
    }
    totalLocked = totalLocked.add(accountMaxLock);
  }

  const averageConviction = multipliers.length > 0 ? multipliers.reduce((a, b) => a + b, 0) / multipliers.length : 0;

  return { activeVotingAccounts, totalLocked, averageConviction };
}

function collectChunks(schedule: Chunks[], accountId: string, target: AccountUnlockChunk[]) {
  for (const chunk of schedule) {
    if (chunk.type === UnlockChunkType.PENDING_LOCK && locksService.isClaimAt(chunk.claimableAt)) {
      const chunkTracks = [...new Set(chunk.affected.map((a) => a.trackId))];
      target.push({
        accountId,
        block: chunk.claimableAt.block,
        amount: chunk.amount.toString(),
        tracks: chunkTracks,
        type: 'pending_lock',
      });
    } else if (chunk.type === UnlockChunkType.PENDING_DELEGATION) {
      target.push({
        accountId,
        block: 0,
        amount: chunk.amount.toString(),
        tracks: [],
        type: 'pending_delegation',
      });
    }
  }
}

export const useChainGovernanceData = (chainId: ChainId, accountIds: string[]) => {
  const chains = useUnit(networkModel.$chains);
  const api = useApi(chainId);

  // Stabilize typedAccountIds — only recompute when the serialized value changes,
  // not on every new array reference from the parent.
  const accountIdsKey = accountIds.join(',');
  const typedAccountIds = useMemo(() => accountIds.map((id) => toAccountId(id)), [accountIdsKey]);

  const { data: tracks, pending: tracksPending } = useTracks({ api });
  const trackIds = useMemo(() => Object.keys(tracks), [tracks]);

  // Fetch track locks first (70 keys — fast) to pre-filter accounts for the
  // much heavier voting subscription (70 × 15 tracks = 1,050 keys without filter).
  const { data: trackLocks } = useTrackLocks({
    api,
    accounts: typedAccountIds.length > 0 ? typedAccountIds : null,
  });

  const governanceAccountIds = useMemo(() => {
    const active = typedAccountIds.filter((id) => {
      const locks = trackLocks[id];

      return locks && Object.keys(locks).length > 0;
    });

    return active.length > 0 ? active : null;
  }, [trackLocks, typedAccountIds]);

  const { data: rawVotingMap, pending: votingPending } = useVoting({
    api,
    tracks: trackIds.length > 0 ? trackIds : null,
    accounts: governanceAccountIds,
  });

  // Filter voting map to only include currently selected accounts.
  // The subscription cache may retain data from previously selected accounts.
  const votingMap = useMemo(() => {
    if (!governanceAccountIds) return EMPTY_VOTING_MAP;
    const accountSet = new Set<AccountId>(governanceAccountIds);
    const filtered: VotingMap = {};

    for (const [accountId, trackVoting] of entries(rawVotingMap)) {
      if (accountSet.has(accountId)) {
        filtered[accountId] = trackVoting;
      }
    }

    return filtered;
  }, [rawVotingMap, governanceAccountIds]);

  const { data: referendums } = useReferendums({ api });
  const { data: undecidingTimeout } = useUndecidingTimeout({ api });

  // Snapshot on first load — dashboard doesn't need live block updates.
  const currentBlock = useSnapshot(useBlock(api).data);
  const blockTime = useSnapshot(useBlockTime(api, chains[chainId]).data);

  const claimData = useMemo(() => {
    if (
      !api ||
      currentBlock === null ||
      !governanceAccountIds ||
      Object.keys(votingMap).length === 0 ||
      referendums.length === 0 ||
      Object.keys(tracks).length === 0
    ) {
      return EMPTY_CLAIM;
    }

    const voteLockingPeriod = api.consts.convictionVoting.voteLockingPeriod.toNumber();
    let totalClaimable = BN_ZERO;
    let totalDelegated = BN_ZERO;
    const allChunks: AccountUnlockChunk[] = [];

    for (const accountId of governanceAccountIds) {
      const votingByTrack = votingMap[accountId];
      if (!votingByTrack) continue;

      const accountTrackLocks = trackLocks[accountId] ?? {};

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
      );

      collectChunks(schedule, accountId, allChunks);

      for (const chunk of schedule) {
        if (chunk.type === UnlockChunkType.CLAIMABLE && !chunk.amount.isZero()) {
          totalClaimable = totalClaimable.add(chunk.amount);
        } else if (chunk.type === UnlockChunkType.PENDING_DELEGATION) {
          totalDelegated = totalDelegated.add(chunk.amount);
        }
      }
    }

    return { claimable: totalClaimable, unlockChunks: allChunks, delegated: totalDelegated };
  }, [api, currentBlock, governanceAccountIds, votingMap, referendums, tracks, trackLocks, undecidingTimeout]);

  const stats = useMemo(() => computeGovernanceStats(votingMap), [votingMap]);

  // Sticky pending — only show skeleton on initial load, not on account changes.
  // Flip when pending states resolve (not when data appears), so accounts with
  // no governance activity don't get stuck in skeleton.
  const hasEverLoaded = useRef(false);
  if (api && !tracksPending && !votingPending) {
    hasEverLoaded.current = true;
  }

  // Chain metadata
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
    unlockChunks: claimData.unlockChunks,
    delegatedAmount: claimData.delegated.toString(),
    blockTimeMs: blockTime?.toNumber() ?? null,
    currentBlock,
    chainName: chain.name,
    symbol: asset.symbol,
    precision: asset.precision,
    icon: asset.icon,
    priceId: asset.priceId,
    pending,
  } satisfies ChainGovernanceData;
};
