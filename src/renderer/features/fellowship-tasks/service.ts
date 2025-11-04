import { type TrackId } from '@/shared/pallet/referenda';
import { type BlockHeight } from '@/shared/polkadotjs-schemas';
import {
  type Evidence,
  type EvidencePeriods,
  type Member,
  type OngoingReferendum,
  evidenceService,
  trackService,
} from '@/domains/collectives';
import { nonNullable } from '../../shared/lib/utils';

// referendum sorting

type Importance = {
  sortingScore: number;
  tags: string[];
};

/**
 * Returns how urgent it is to vote on this referendum, normalized to [0..1]. A
 * value of 1 indicates maximum urgency (referendum is about to end), and a
 * value of 0 indicates minimum urgency (more than 3 days remain).
 */
function getUrgencyScore(blocksLeft: number): number {
  // TODO use real block time
  const threeDaysBlocks = (3 * 24 * 3600) / 6;
  const sevenDaysBlocks = (7 * 24 * 3600) / 6;

  if (blocksLeft <= 0) {
    // Referendum ends imminently or already ended
    return 1;
  }

  if (blocksLeft <= threeDaysBlocks) {
    return 1.0 - blocksLeft / threeDaysBlocks;
  }

  return (1.0 - blocksLeft / sevenDaysBlocks) * 0.5;
}

/**
 * Returns how 'controversial' the referendum is, normalized to [0..1]. 1 means
 * maximally controversial (votes are very close to 50-50 and most of the
 * potential votes have been cast), 0 means no votes are cast yet or the vote is
 * not close.
 */
function getReferendumControversyScore(referendum: OngoingReferendum, maximumAvailableVotingWeight: number): number {
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
function getReferendumUserImportanceScore(maximumAvailableVotingWeight: number, userVotingPower: number) {
  if (maximumAvailableVotingWeight <= 0) {
    return 1;
  }

  const importance = userVotingPower / maximumAvailableVotingWeight;
  return Math.max(0, Math.min(1, importance));
}

/**
 * Weights are adjustable and can be changed after feedback
 */
function getSortingScope(urgencyScore: number, controversyScore: number, userImportanceScore: number) {
  const isUrgent = urgencyScore > 0.3;
  const isControversial = controversyScore > 0.5;
  const isImportantVote = userImportanceScore > 0.5;

  let sortingScore = urgencyScore * 0.1;

  if (isUrgent && isImportantVote) {
    sortingScore += 0.9;
  }
  if (isUrgent && isControversial) {
    sortingScore += 0.75;
  }
  if (isImportantVote || isUrgent) {
    sortingScore += 0.5;
  }
  if (isControversial) {
    sortingScore += 0.25;
  }

  return {
    sortingScore,
    isUrgent,
    isImportantVote,
    isControversial,
  };
}

/**
 * Computes an overall importance (sorting score) for a given referendum, along
 * with a set of tags for UI to display The sortingScore is a simple linear
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
}): Importance {
  const urgencyScore = getUrgencyScore(referendum.ends - currentBlock);
  const controversyScore = getReferendumControversyScore(referendum, maximumAvailableVotingWeight);
  const userImportanceScore = getReferendumUserImportanceScore(maximumAvailableVotingWeight, memberVotingWeight);

  const tags: string[] = [];
  const { sortingScore, isUrgent, isImportantVote, isControversial } = getSortingScope(
    urgencyScore,
    controversyScore,
    userImportanceScore,
  );

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

// evidence sorting

function getEvidenceImportance(
  evidence: Evidence,
  member: Member,
  periods: EvidencePeriods,
  currentBlock: BlockHeight,
): Importance {
  // Promotion evidences are not critical and doesn't have expiration date.
  if (evidence.wish === 'Promotion') {
    return {
      tags: [],
      sortingScore: -0.1,
    };
  }

  if (evidence.wish === 'Retention') {
    const blocksLeft = evidenceService.getBlocksUntilDemotion(member, periods, currentBlock);
    const urgencyScore = nonNullable(blocksLeft) ? getUrgencyScore(blocksLeft) : 0;
    const isUrgent = urgencyScore > 0.3;
    const tags: string[] = [];

    const sortingScore = isUrgent ? 0.9 + urgencyScore * 0.1 : urgencyScore;

    if (isUrgent) {
      tags.push('urgent');
    }

    return {
      sortingScore,
      tags,
    };
  }

  return {
    sortingScore: 0,
    tags: [],
  };
}

// voting weight

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

function cutMarkdown(markdown: string) {
  const MAX_SIZE = 200;

  if (markdown.length <= MAX_SIZE) {
    return markdown;
  }

  let totalLength = 0;
  const chunks = markdown.split(' ');
  const result: string[] = [];
  for (const chunk of chunks) {
    if (chunk.startsWith('<img')) continue;
    if (chunk.startsWith('<br>')) continue;

    result.push(chunk);
    totalLength += chunk.length;
    if (totalLength > MAX_SIZE) {
      break;
    }
  }

  return result.join(' ') + '...';
}

export const tasksService = {
  getReferendumUserImportanceScore,
  getMaximumAvailableVotingWeight,
  getReferendumImportance,
  getEvidenceImportance,
  cutMarkdown,
};
