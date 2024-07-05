import { CompletedReferendum, OngoingReferendum } from '@shared/core';
import { includes } from '@shared/lib/utils';
import { AggregatedReferendum, VoteStatus } from '@features/governance';
import { referendumService } from '@entities/governance';

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
  referendum: AggregatedReferendum;
  selectedVoteId: string;
};

function isReferendumVoted({ selectedVoteId, referendum }: FilterByVoteParams) {
  if (!selectedVoteId) {
    return true;
  }

  return selectedVoteId === VoteStatus.VOTED ? referendum.isVoted : !referendum.isVoted;
}

function isReferendumInTrack(selectedTrackIds: string[], referendum: AggregatedReferendum) {
  if (!selectedTrackIds?.length) {
    return true;
  }

  if (!isAggregatedReferendumOngoing(referendum)) {
    return false;
  }

  return selectedTrackIds.includes(referendum.referendum.track);
}

function isAggregatedReferendumOngoing(r: AggregatedReferendum): r is AggregatedReferendum<OngoingReferendum> {
  return referendumService.isOngoing(r.referendum);
}

function isAggregatedReferendumCompleted(r: AggregatedReferendum): r is AggregatedReferendum<CompletedReferendum> {
  return referendumService.isCompleted(r.referendum);
}
