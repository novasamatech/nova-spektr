import { BN, BN_ZERO } from '@polkadot/util';
import clone from 'lodash/clone';
import isEqual from 'lodash/isEqual';
import orderBy from 'lodash/orderBy';
import sortBy from 'lodash/sortBy';
import uniqWith from 'lodash/uniqWith';

import {
  type Chunks,
  type ClaimAction,
  type ClaimAffect,
  type ClaimTime,
  type ClaimableChunk,
  type ClaimableLock,
  type GroupedClaimAffects,
  type PendingChunk,
  UnlockChunkType,
} from '@/shared/api/governance';
import {
  type AccountVote,
  type BlockHeight,
  type CastingVoting,
  type DelegatingVoting,
  type OngoingReferendum,
  type Referendum,
  type TrackId,
  type TrackInfo,
  type Voting,
} from '@/shared/core';

import { locksService } from './lockService';
import { referendumService } from './referendumService';
import { votingService } from './votingService';

export const claimScheduleService = {
  estimateClaimSchedule,
};

type ClaimParams = {
  currentBlockNumber: BlockHeight;
  referendums: Referendum[];
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
}: ClaimParams): Chunks[] {
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
  referendums: Referendum[],
  votingByTrack: Record<TrackId, Voting>,
  tracks: Record<TrackId, TrackInfo>,
  trackLocks: Record<TrackId, BN>,
  voteLockingPeriod: BlockHeight,
  undecidingTimeout: BlockHeight,
): ClaimableLock[] {
  const gapBetweenVotingAndLocked = gapBetween(votingByTrack, trackLocks);

  return Object.entries(votingByTrack).flatMap(([trackId, voting]) => {
    const gapLock = gapClaimableLock({ currentBlockNumber, trackId, voting, gap: gapBetweenVotingAndLocked });
    if (votingService.isCasting(voting)) {
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
    if (votingService.isDelegating(voting)) {
      return gapLock.concat(delegatingClaimableLocks(trackId, voting));
    }

    return gapLock;
  });
}

function gapBetween(votingByTrack: Record<TrackId, Voting>, trackLocks: Record<TrackId, BN>): Record<TrackId, BN> {
  const gapByTrack: Record<TrackId, BN> = {};

  for (const [trackId, voting] of Object.entries(votingByTrack)) {
    const trackLock = trackLocks[trackId] || BN_ZERO;

    gapByTrack[trackId] = BN.max(trackLock.sub(locksService.getTotalLock(voting)), BN_ZERO);
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
      claimAt: { type: 'at', block: currentBlockNumber },
      amount: trackGap.add(locksService.getTotalLock(voting)),
      affected: [{ trackId, type: 'track' }],
    },
  ];
}

function castingClaimableLocks(
  currentBlockNumber: BlockHeight,
  referendums: Referendum[],
  trackId: TrackId,
  tracks: Record<TrackId, TrackInfo>,
  voting: CastingVoting,
  voteLockingPeriod: BlockHeight,
  undecidingTimeout: BlockHeight,
): ClaimableLock[] {
  const priorLock = {
    claimAt: { type: 'at', block: voting.casting.prior.unlockAt },
    amount: voting.casting.prior.amount,
    affected: [{ trackId, type: 'track' }],
  } satisfies ClaimableLock;

  const votes = Object.values(voting.casting.votes);
  const standardVotes = votes.filter(votingService.isStandardVote);

  const standardVoteLocks = standardVotes.map<ClaimableLock>((standardVote) => {
    const estimatedEnd = maxConvictionEndOf(
      currentBlockNumber,
      trackId,
      tracks,
      standardVote,
      voteLockingPeriod,
      undecidingTimeout,
      referendums.find((i) => i.referendumId === standardVote.referendumId),
    );

    return {
      // we estimate whether prior will affect the vote when performing `removeVote`
      claimAt: {
        type: 'at',
        block: Math.max(estimatedEnd, priorLock.claimAt.block),
      },
      amount: standardVote.balance || BN_ZERO,
      affected: [{ trackId, type: 'vote', referendumId: standardVote.referendumId }],
    };
  });

  return priorLock.amount.isZero() ? standardVoteLocks : [priorLock, ...standardVoteLocks];
}

function delegatingClaimableLocks(trackId: TrackId, voting: DelegatingVoting): ClaimableLock[] {
  const delegationLock = {
    claimAt: { type: 'until' },
    amount: voting.delegating.balance,
    affected: [],
  } satisfies ClaimableLock;

  const priorLock = {
    claimAt: { type: 'at', block: voting.delegating.prior.unlockAt },
    amount: voting.delegating.prior.amount,
    affected: [{ type: 'track', trackId }],
  } satisfies ClaimableLock;

  return priorLock.amount.isZero() ? [delegationLock] : [delegationLock, priorLock];
}

function maxConvictionEndOf(
  currentBlockNumber: BlockHeight,
  trackId: TrackId,
  tracks: Record<TrackId, TrackInfo>,
  vote: AccountVote,
  voteLockingPeriod: BlockHeight,
  undecidingTimeout: BlockHeight,
  referendum?: Referendum,
): BlockHeight {
  // referendum is not in the map, which means it is cancelled and votes can be unlocked immediately
  return referendum
    ? referendumMaxConvictionEnd(referendum, trackId, tracks, vote, voteLockingPeriod, undecidingTimeout)
    : currentBlockNumber;
}

function referendumMaxConvictionEnd(
  referendum: Referendum,
  trackId: TrackId,
  tracks: Record<TrackId, TrackInfo>,
  vote: AccountVote,
  voteLockingPeriod: BlockHeight,
  undecidingTimeout: BlockHeight,
): BlockHeight {
  if (referendumService.isOngoing(referendum)) {
    return maxOngoingConvictionEnd(referendum, vote, trackId, tracks, voteLockingPeriod, undecidingTimeout);
  }
  if (referendumService.isRejected(referendum)) {
    return maxCompletedConvictionEnd(vote, 'nay', referendum.since, voteLockingPeriod);
  }
  if (referendumService.isApproved(referendum)) {
    return maxCompletedConvictionEnd(vote, 'aye', referendum.since, voteLockingPeriod);
  }

  return referendumService.isTimedOut(referendum) ? referendum.since : 0;
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
  if (votingService.isStandardVote(vote) && vote.vote.type === referendumOutcome) {
    return locksService.getLockPeriods(vote.vote.conviction) * lockPeriod;
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
  if (votingService.isStandardVote(vote)) {
    return locksService.getLockPeriods(vote.vote.conviction) * lockPeriod;
  }

  return 0;
}

// Step 2
function combineSameUnlockAt(claimableLocks: ClaimableLock[]): [ClaimTime, ClaimableLock][] {
  const claimGroups = claimableLocks.reduce<Map<string, ClaimableLock[]>>((acc, lock) => {
    const key = locksService.isClaimAt(lock.claimAt)
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
  return locksService.isClaimAt(claimTime) ? `at-${claimTime.block}` : 'until';
}

// Step 4
function toUnlockChunks(locks: ClaimableLock[], currentBlockNumber: BlockHeight): Chunks[] {
  const chunks = locks.map((item) => toUnlockChunk(item, currentBlockNumber));

  const claimable = chunks.filter((chunk): chunk is ClaimableChunk => chunk.type === UnlockChunkType.CLAIMABLE);
  const nonClaimable = chunks.filter((chunk): chunk is PendingChunk => chunk.type !== UnlockChunkType.CLAIMABLE);

  // Fold all claimable chunks into a single one
  const claimableChunk = claimable.reduce<ClaimableChunk>(
    (acc, chunk) => {
      acc.amount = acc.amount.add(chunk.amount);
      acc.actions = acc.actions.concat(chunk.actions);

      return acc;
    },
    { type: UnlockChunkType.CLAIMABLE, amount: BN_ZERO, actions: [] },
  );

  return claimableChunk.amount.isZero() ? nonClaimable : [claimableChunk, ...nonClaimable];
}

function toUnlockChunk(lock: ClaimableLock, currentBlockNumber: BlockHeight): Chunks {
  if (claimableAt(lock.claimAt, currentBlockNumber)) {
    return {
      type: UnlockChunkType.CLAIMABLE,
      amount: lock.amount,
      actions: toClaimActions(lock.affected),
    };
  }
  const type = locksService.isClaimAt(lock.claimAt) ? UnlockChunkType.PENDING_LOCK : UnlockChunkType.PENDING_DELIGATION;

  return { type: type, amount: lock.amount, claimableAt: lock.claimAt };
}

function claimableAt(claimAt: ClaimTime, at: BlockHeight): boolean {
  return locksService.isClaimAt(claimAt) ? claimAt.block <= at : false;
}

function toClaimActions(claimAffects: ClaimAffect[]): ClaimAction[] {
  return groupByTrack(claimAffects).reduce<ClaimAction[]>((acc, trackAffects) => {
    if (trackAffects.hasPriorAffect) {
      if (trackAffects.votes.length === 0) {
        acc.push({ type: 'unlock', trackId: trackAffects.trackId });
      }
    }

    if (trackAffects.votes.length > 0) {
      for (const voteAffect of trackAffects.votes) {
        acc.push({
          type: 'remove_vote',
          trackId: voteAffect.trackId,
          referendumId: voteAffect.referendumId,
        });
      }

      acc.push({ type: 'unlock', trackId: trackAffects.votes[0].trackId });
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
      votes: trackAffects.filter((t) => t.type === 'vote'),
    };
  });
}
