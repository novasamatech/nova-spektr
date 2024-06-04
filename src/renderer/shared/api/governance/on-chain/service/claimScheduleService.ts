import { BN, BN_ZERO } from '@polkadot/util';
import uniqWith from 'lodash/uniqWith';
import isEqual from 'lodash/isEqual';
import orderBy from 'lodash/orderBy';
import sortBy from 'lodash/sortBy';
import clone from 'lodash/clone';

import { onChainUtils } from '../lib/on-chain-utils';
import {
  type ClaimableLock,
  AffectVote,
  AffectTrack,
  ClaimTime,
  ClaimTimeAt,
  GroupedClaimAffects,
  ClaimAffect,
  ClaimAction,
  Unlock,
  RemoveVote,
  UnlockChunk,
  PendingChunk,
  ClaimableChunk,
  ClaimTimeUntil,
} from '../lib/claim-types';
import type {
  BlockHeight,
  ReferendumInfo,
  TrackInfo,
  Voting,
  ReferendumId,
  TrackId,
  CastingVoting,
  AccountVote,
  TimedOutReferendum,
  OngoingReferendum,
  StandardVote,
  DelegatingVoting,
} from '@shared/core';

export const claimScheduleService = {
  estimateClaimSchedule,
};

type ClaimParams = {
  currentBlockNumber: BlockHeight;
  referendums: Record<ReferendumId, ReferendumInfo>;
  tracks: Record<TrackId, TrackInfo>;
  trackLocks: Record<TrackId, BN>;
  votingByTrack: Record<TrackId, Voting>;
  undecidingTimeout: BlockHeight;
  voteLockingPeriod: BlockHeight;
};
function estimateClaimSchedule({
  currentBlockNumber,
  referendums,
  tracks,
  trackLocks,
  votingByTrack,
  undecidingTimeout,
  voteLockingPeriod,
}: ClaimParams): UnlockChunk[] {
  // step 1 - determine/estimate individual unlocks for all priors and votes
  // result example: [(1500, 1 KSM), (1200, 2 KSM), (1000, 1 KSM)]
  const claimableLocks = individualClaimableLocks(
    currentBlockNumber,
    referendums,
    votingByTrack,
    tracks,
    trackLocks,
    voteLockingPeriod,
    undecidingTimeout,
  );

  // step 2 - fold all locks with same lockAt
  // { 1500: 1 KSM, 1200: 2 KSM, 1000: 1 KSM }
  const maxUnlockedByTime = combineSameUnlockAt(claimableLocks);

  // step 3 - convert individual schedule to global
  // [(1500, 1 KSM), (1200, 1 KSM)]
  const unlockSchedule = constructUnlockSchedule(maxUnlockedByTime);

  // step 4 - convert locks affects to claim actions
  return toUnlockChunks(unlockSchedule, currentBlockNumber);
}

// Step 1
function individualClaimableLocks(
  currentBlockNumber: BlockHeight,
  referendums: Record<ReferendumId, ReferendumInfo>,
  votingByTrack: Record<TrackId, Voting>,
  tracks: Record<TrackId, TrackInfo>,
  trackLocks: Record<TrackId, BN>,
  voteLockingPeriod: BlockHeight,
  undecidingTimeout: BlockHeight,
): ClaimableLock[] {
  const gapBetweenVotingAndLocked = gapBetween(votingByTrack, trackLocks);

  return Object.entries(votingByTrack).flatMap(([trackId, voting]) => {
    const gapLock = gapClaimableLock({ currentBlockNumber, trackId, voting, gap: gapBetweenVotingAndLocked });
    if (onChainUtils.isCasting(voting)) {
      return gapLock.concat(
        castingClaimableLocks(
          currentBlockNumber,
          referendums,
          trackId,
          tracks,
          voting,
          voteLockingPeriod,
          undecidingTimeout,
        ),
      );
    }
    if (onChainUtils.isDelegating(voting)) {
      return gapLock.concat(delegatingClaimableLocks(trackId, voting));
    }

    return gapLock;
  });
}

function gapBetween(votingByTrack: Record<TrackId, Voting>, trackLocks: Record<TrackId, BN>): Record<TrackId, BN> {
  const gapByTrack: Record<TrackId, BN> = {};

  for (const [trackId, voting] of Object.entries(votingByTrack)) {
    const trackLock = trackLocks[trackId] || BN_ZERO;

    gapByTrack[trackId] = BN.max(trackLock.sub(onChainUtils.getTotalLock(voting)), BN_ZERO);
  }

  return gapByTrack;
}

type GapLockParams = {
  trackId: TrackId;
  voting: Voting;
  gap: Record<TrackId, BN>;
  currentBlockNumber: BlockHeight;
};
function gapClaimableLock({ trackId, voting, gap, currentBlockNumber }: GapLockParams): ClaimableLock[] {
  const trackGap = gap[trackId] || BN_ZERO;

  if (trackGap.isZero()) return [];

  return [
    {
      claimAt: { type: 'at', block: currentBlockNumber } as ClaimTime,
      amount: trackGap.add(onChainUtils.getTotalLock(voting)),
      affected: [{ trackId, type: 'track' } as AffectTrack],
    },
  ];
}

function castingClaimableLocks(
  currentBlockNumber: BlockHeight,
  referendums: Record<ReferendumId, ReferendumInfo>,
  trackId: TrackId,
  tracks: Record<TrackId, TrackInfo>,
  voting: CastingVoting,
  voteLockingPeriod: BlockHeight,
  undecidingTimeout: BlockHeight,
): ClaimableLock[] {
  const priorLock: ClaimableLock = {
    claimAt: { type: 'at', block: voting.casting.prior.unlockAt } as ClaimTime,
    amount: voting.casting.prior.amount,
    affected: [{ trackId, type: 'track' } as AffectTrack],
  };

  const standardVotes = Object.entries(voting.casting.votes) as [string, StandardVote][];

  const standardVoteLocks = standardVotes.map(([referendumId, standardVote]) => {
    const estimatedEnd = maxConvictionEndOf(
      currentBlockNumber,
      trackId,
      tracks,
      standardVote,
      voteLockingPeriod,
      undecidingTimeout,
      referendums[referendumId],
    );

    return {
      // we estimate whether prior will affect the vote when performing `removeVote`
      claimAt: {
        type: 'at',
        block: Math.max(estimatedEnd, (priorLock.claimAt as ClaimTimeAt).block),
      } as ClaimTime,
      amount: standardVote.balance,
      affected: [{ trackId, type: 'vote', referendumId } as AffectVote],
    } as ClaimableLock;
  });

  return priorLock.amount.isZero() ? standardVoteLocks : [priorLock, ...standardVoteLocks];
}

function delegatingClaimableLocks(trackId: TrackId, voting: DelegatingVoting): ClaimableLock[] {
  const delegationLock = {
    claimAt: { type: 'until' } as ClaimTimeUntil,
    amount: voting.delegating.balance,
    affected: [],
  } as ClaimableLock;

  const priorLock = {
    claimAt: { type: 'at', block: voting.delegating.prior.unlockAt } as ClaimTimeAt,
    amount: voting.delegating.prior.amount,
    affected: [{ type: 'track', trackId } as AffectTrack],
  } as ClaimableLock;

  return priorLock.amount.isZero() ? [delegationLock] : [delegationLock, priorLock];
}

function maxConvictionEndOf(
  currentBlockNumber: BlockHeight,
  trackId: TrackId,
  tracks: Record<TrackId, TrackInfo>,
  vote: AccountVote,
  voteLockingPeriod: BlockHeight,
  undecidingTimeout: BlockHeight,
  referendum?: ReferendumInfo,
): BlockHeight {
  // referendum is not in the map, which means it is cancelled and votes can be unlocked immediately
  return referendum
    ? referendumMaxConvictionEnd(referendum, trackId, tracks, vote, voteLockingPeriod, undecidingTimeout)
    : currentBlockNumber;
}

function referendumMaxConvictionEnd(
  referendum: ReferendumInfo,
  trackId: TrackId,
  tracks: Record<TrackId, TrackInfo>,
  vote: AccountVote,
  voteLockingPeriod: BlockHeight,
  undecidingTimeout: BlockHeight,
): BlockHeight {
  if (onChainUtils.isOngoing(referendum)) {
    return maxOngoingConvictionEnd(referendum, vote, trackId, tracks, voteLockingPeriod, undecidingTimeout);
  }
  if (onChainUtils.isRejected(referendum)) {
    return maxCompletedConvictionEnd(vote, 'nay', referendum.since, voteLockingPeriod);
  }
  if (onChainUtils.isApproved(referendum)) {
    return maxCompletedConvictionEnd(vote, 'aye', referendum.since, voteLockingPeriod);
  }

  return (referendum as TimedOutReferendum).since;
}

function maxCompletedConvictionEnd(
  vote: AccountVote,
  referendumOutcome: 'aye' | 'nay',
  completedSince: BlockHeight,
  voteLockingPeriod: BlockHeight,
): BlockHeight {
  const convictionPart = completedReferendumLockDuration(vote, referendumOutcome, voteLockingPeriod);

  return completedSince + convictionPart;
}

function completedReferendumLockDuration(
  vote: AccountVote,
  referendumOutcome: 'aye' | 'nay',
  lockPeriod: BlockHeight,
): BlockHeight {
  // vote has the same direction as outcome
  if (onChainUtils.isStandardVote(vote) && vote.vote.type === referendumOutcome) {
    return onChainUtils.getLockPeriods(vote.vote.conviction) * lockPeriod;
  }

  return 0;
}

function maxOngoingConvictionEnd(
  referendum: OngoingReferendum,
  vote: AccountVote,
  trackId: TrackId,
  tracks: Record<TrackId, TrackInfo>,
  voteLockingPeriod: BlockHeight,
  undecidingTimeout: BlockHeight,
): BlockHeight {
  const trackInfo = tracks[trackId];
  const decisionPeriod = trackInfo.decisionPeriod;
  const blocksAfterCompleted = voteMaxLockDuration(vote, voteLockingPeriod);

  let maxCompletedAt;
  if (referendum.inQueue) {
    maxCompletedAt = referendum.submitted + undecidingTimeout + decisionPeriod;
  } else if (referendum.deciding) {
    if (referendum.deciding.confirming) {
      // confirming
      const approveBlock = referendum.deciding.confirming;
      const rejectBlock = referendum.deciding.since + decisionPeriod;

      maxCompletedAt = Math.max(approveBlock, rejectBlock);
    } else {
      // rejecting
      maxCompletedAt = referendum.deciding.since + decisionPeriod;
    }
  } else {
    // preparing
    maxCompletedAt = referendum.submitted + Math.max(undecidingTimeout, trackInfo.preparePeriod) + decisionPeriod;
  }

  return maxCompletedAt + blocksAfterCompleted;
}

function voteMaxLockDuration(vote: AccountVote, lockPeriod: BlockHeight): BlockHeight {
  if (onChainUtils.isStandardVote(vote)) {
    return onChainUtils.getLockPeriods(vote.vote.conviction) * lockPeriod;
  }

  return 0;
}

// Step 2
function combineSameUnlockAt(claimableLocks: ClaimableLock[]): [ClaimTime, ClaimableLock][] {
  const claimGroups = claimableLocks.reduce<Map<string, ClaimableLock[]>>((acc, lock) => {
    const key = onChainUtils.isClaimAt(lock.claimAt)
      ? `${lock.claimAt.type}_${lock.claimAt.block || '0'}`
      : lock.claimAt.type;

    if (acc.has(key)) {
      acc.get(key)!.push(lock);
    } else {
      acc.set(key, [lock]);
    }

    return acc;
  }, new Map());

  return Array.from(claimGroups.entries()).reduce<[ClaimTime, ClaimableLock][]>((acc, [_, locks]) => {
    const combinedLock = locks.reduce<ClaimableLock>(
      (total, lock) => ({
        claimAt: lock.claimAt,
        amount: BN.max(total.amount, lock.amount),
        affected: uniqWith(total.affected.concat(lock.affected), isEqual),
      }),
      { claimAt: { type: 'until' }, amount: BN_ZERO, affected: [] },
    );

    acc.push([locks[0].claimAt, combinedLock]);

    return acc;
  }, []);
}

// Step 3
function constructUnlockSchedule(maxUnlockedByTime: [ClaimTime, ClaimableLock][]): ClaimableLock[] {
  let currentMaxLock = BN_ZERO;
  let currentMaxLockAt: ClaimTime | null = null;

  const result = new Map(clone(maxUnlockedByTime));
  const sortedMaxUnlock = orderBy(maxUnlockedByTime, ([claimTime]) => getClaimTimeSortKey(claimTime), 'desc');

  sortedMaxUnlock.forEach(([claimAt, lock]) => {
    const newMaxLock = BN.max(currentMaxLock, lock.amount);
    const unlockedAmount = lock.amount.sub(currentMaxLock);

    const shouldSetNewMax = currentMaxLockAt === null || currentMaxLock.lt(newMaxLock);
    if (shouldSetNewMax) {
      currentMaxLock = newMaxLock;
      currentMaxLockAt = claimAt;
    }

    if (unlockedAmount.isNeg()) {
      // this lock is completely shadowed by later (in time) lock with greater value
      result.delete(claimAt);

      // but we want to keep its actions, so we move it to the current known maximum that goes later in time
      if (currentMaxLockAt && result.has(currentMaxLockAt)) {
        const maxLockItem = result.get(currentMaxLockAt)!;
        maxLockItem.affected = uniqWith(maxLockItem.affected.concat(lock.affected), isEqual);
      }
    } else {
      // there is something to unlock at this point
      result.get(claimAt)!.amount = unlockedAmount;
    }
  });

  return sortBy(Array.from(result.entries()), ([claimTime]) => getClaimTimeSortKey(claimTime)).map(
    ([_, claim]) => claim,
  );
}

function getClaimTimeSortKey(claimTime: ClaimTime): string {
  return onChainUtils.isClaimAt(claimTime) ? `at-${claimTime.block}` : 'until';
}

// Step 4
function toUnlockChunks(locks: ClaimableLock[], currentBlockNumber: BlockHeight): UnlockChunk[] {
  const chunks = locks.map((item) => toUnlockChunk(item, currentBlockNumber));

  const claimable = chunks.filter((chunk): chunk is ClaimableChunk => chunk.type === 'claimable');
  const nonClaimable = chunks.filter((chunk): chunk is PendingChunk => chunk.type === 'pending');

  // Fold all claimable chunks into a single one
  const claimableChunk = claimable.reduce<ClaimableChunk>(
    (acc, chunk) => {
      acc.amount = acc.amount.add(chunk.amount);
      acc.actions = acc.actions.concat(chunk.actions);

      return acc;
    },
    { type: 'claimable', amount: BN_ZERO, actions: [] },
  );

  return claimableChunk.amount.isZero() ? nonClaimable : [claimableChunk, ...nonClaimable];
}

function toUnlockChunk(lock: ClaimableLock, currentBlockNumber: BlockHeight): UnlockChunk {
  if (claimableAt(lock.claimAt, currentBlockNumber)) {
    return { type: 'claimable', amount: lock.amount, actions: toClaimActions(lock.affected) } as UnlockChunk;
  }

  return { type: 'pending', amount: lock.amount, claimableAt: lock.claimAt } as PendingChunk;
}

function claimableAt(claimAt: ClaimTime, at: BlockHeight): Boolean {
  return onChainUtils.isClaimAt(claimAt) ? claimAt.block <= at : false;
}

function toClaimActions(claimAffects: ClaimAffect[]): ClaimAction[] {
  return groupByTrack(claimAffects).reduce<ClaimAction[]>((acc, trackAffects) => {
    if (trackAffects.hasPriorAffect) {
      if (trackAffects.votes.length === 0) {
        acc.push({ type: 'unlock', trackId: trackAffects.trackId } as Unlock);
      }
    }

    if (trackAffects.votes.length > 0) {
      trackAffects.votes.forEach((voteAffect) => {
        acc.push({
          type: 'remove_vote',
          trackId: voteAffect.trackId,
          referendumId: voteAffect.referendumId,
        } as RemoveVote);
      });

      acc.push({ type: 'unlock', trackId: trackAffects.votes[0].trackId } as Unlock);
    }

    return acc;
  }, []);
}

function groupByTrack(claimAffects: ClaimAffect[]): GroupedClaimAffects[] {
  const groupedClaims = claimAffects.reduce<Map<TrackId, ClaimAffect[]>>((acc, claimAffect) => {
    if (acc.has(claimAffect.trackId)) {
      acc.get(claimAffect.trackId)!.push(claimAffect);
    } else {
      acc.set(claimAffect.trackId, [claimAffect]);
    }

    return acc;
  }, new Map());

  return Array.from(groupedClaims.entries()).map(([trackId, trackAffects]) => {
    return {
      trackId,
      hasPriorAffect: trackAffects.some((t) => t.type === 'track'),
      votes: trackAffects.filter((t) => t.type === 'vote') as AffectVote[],
    } as GroupedClaimAffects;
  });
}
