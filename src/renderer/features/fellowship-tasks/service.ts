import { type TrackId } from '@/shared/pallet/referenda';
import { type BlockHeight } from '@/shared/polkadotjs-schemas';
import { type Member, type OngoingReferendum, trackService } from '@/domains/collectives';

type ReferendumImportance = {
  sortingScore: number;
  tags: string[];
};

/**
 * Returns how urgent it is to vote on this referendum, normalized to [0..1]. A
 * value of 1 indicates maximum urgency (referendum is about to end), and a
 * value of 0 indicates minimum urgency (more than 3 days remain).
 */
function getUrgencyScore(referendum: OngoingReferendum, currentBlock: BlockHeight): number {
  const blocksLeft = referendum.ends - currentBlock;
  // TODO use real block time
  const threeDaysBlocks = (3 * 24 * 3600) / 6;

  if (blocksLeft <= 0) {
    // Referendum ends imminently or already ended
    return 1;
  }

  if (blocksLeft >= threeDaysBlocks) {
    return 0;
  }

  return 1.0 - blocksLeft / threeDaysBlocks;
}

/**
 * Returns how 'controversial' the referendum is, normalized to [0..1]. 1 means
 * maximally controversial (votes are very close to 50-50 and most of the
 * potential votes have been cast), 0 means no votes are cast yet or the vote is
 * not close.
 */
function getControversyScore(referendum: OngoingReferendum, maximumAvailableVotingWeight: number): number {
  const totalCast = referendum.tally.ayes + referendum.tally.nays;

  if (totalCast == 0) {
    return 0;
  }

  if (maximumAvailableVotingWeight == 0) {
    return 0.0;
  }

  const fractionCast = totalCast / maximumAvailableVotingWeight;
  const fractionAyes = referendum.tally.ayes / totalCast;

  // closenessToSplit is 1 if fractionAyes = 0.5 and 0 if fractionAyes=0 or  fractionAyes=1
  const closenessToSplit = 1.0 - Math.abs(0.5 - fractionAyes) * 2.0;

  const controversy = fractionCast * closenessToSplit;

  return Math.max(0.0, Math.min(1.0, controversy));
}

/**
 * Returns how important the current user's vote might be, normalized to [0..1].
 * 1 indicates that the user alone holds all (or nearly all) the voting power, 0
 * indicates the user has no effective voting power relative to the total.
 */
function getUserImportanceScore(maximumAvailableVotingWeight: number, userVotingPower: number) {
  if (maximumAvailableVotingWeight <= 0) {
    return 1;
  }

  const importance = userVotingPower / maximumAvailableVotingWeight;
  return Math.max(0, Math.min(1, importance));
}

/**
 * Weights are adjustable and can be changed after feedback
 */
function getSortingScope(isUrgent: boolean, isControversial: boolean, isImportantVote: boolean) {
  if (isUrgent && isImportantVote) {
    return 1;
  }
  if (isUrgent && isControversial) {
    return 0.75;
  }
  if (isImportantVote || isUrgent) {
    return 0.5;
  }
  if (isControversial) {
    return 0.25;
  }

  return 0;
}

/**
 * Computes an overall importance (sorting_score) for a given referendum, along
 * with a set of tags for UI to display The sorting_score is a simple linear
 * combination of the three sub-scores
 */
function getReferendumImportance({
  referendum,
  maximumAvailableVotingWeight,
  memberVotingWeight,
  currentBlock,
}: {
  referendum: OngoingReferendum;
  maximumAvailableVotingWeight: number;
  memberVotingWeight: number;
  currentBlock: BlockHeight;
}): ReferendumImportance {
  const urgencyScore = getUrgencyScore(referendum, currentBlock);
  const controversyScore = getControversyScore(referendum, maximumAvailableVotingWeight);
  const userImportanceScore = getUserImportanceScore(maximumAvailableVotingWeight, memberVotingWeight);

  const isUrgent = urgencyScore > 0.3;
  const isControversial = controversyScore > 0.5;
  const isImportantVote = userImportanceScore > 0.5;

  const tags: string[] = [];
  const sortingScore = getSortingScope(isUrgent, isControversial, isImportantVote);

  if (isUrgent) {
    tags.push('urgent');
  }
  if (isControversial) {
    tags.push('controversial');
  }
  if (isImportantVote) {
    tags.push('importantVote');
  }

  return {
    sortingScore,
    tags,
  };
}

function getMaximumAvailableVotingWeight(members: Member[], maxRank: number, track: TrackId): number {
  let max = 0;

  for (const member of members) {
    if (trackService.rankSatisfiesVotingThreshold(member.rank, maxRank, track)) {
      max += trackService.getVoteWeight({
        pallet: 'fellowship',
        maxRank,
        track,
        rank: member.rank,
      });
    }
  }

  return max;
}

export const tasksService = {
  getUrgencyScore,
  getControversyScore,
  getUserImportanceScore,
  getMaximumAvailableVotingWeight,
  getReferendumImportance,
};
