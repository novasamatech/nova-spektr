import { CompletedReferendum, OngoingReferendum, Referendum, ReferendumId, VotingMap } from '@shared/core';
import { includes } from '@shared/lib/utils';
import { AggregatedReferendum, VoteStatus } from '@features/governance';
import { referendumService, votingService } from '@entities/governance';

export const governancePageUtils = {
  filteredByQuery,
  isReferendumVoted,
  isReferendumInTrack,

  isAggregatedReferendumOngoing,
  isAggregatedReferendumCompleted,
};

type FilteredByQueryParams<T> = {
  referendums: T[];
  query: string;
};

function filteredByQuery<T extends AggregatedReferendum>({ referendums, query }: FilteredByQueryParams<T>): T[] {
  if (!query) {
    return referendums;
  }

  return referendums.filter(({ referendum, title }) => {
    const hasIndex = includes(referendum.referendumId, query);
    const hasTitle = includes(title ?? '', query);

    return hasIndex || hasTitle;
  });
}

type FilterByVoteParams = {
  referendumId: ReferendumId;
  selectedVoteId: string;
  voting: VotingMap;
};

function isReferendumVoted({ selectedVoteId, referendumId, voting }: FilterByVoteParams) {
  if (!selectedVoteId) {
    return true;
  }

  const isReferendumVoted = votingService.isReferendumVoted(referendumId, voting);

  return selectedVoteId === VoteStatus.VOTED ? isReferendumVoted : !isReferendumVoted;
}

function isReferendumInTrack(selectedTrackIds: string[], referendum: Referendum) {
  if (!selectedTrackIds?.length) {
    return true;
  }

  if (!referendumService.isOngoing(referendum)) {
    return false;
  }

  return selectedTrackIds.includes(referendum.track);
}

function isAggregatedReferendumOngoing(r: AggregatedReferendum): r is AggregatedReferendum<OngoingReferendum> {
  return referendumService.isOngoing(r.referendum);
}

function isAggregatedReferendumCompleted(r: AggregatedReferendum): r is AggregatedReferendum<CompletedReferendum> {
  return referendumService.isCompleted(r.referendum);
}
