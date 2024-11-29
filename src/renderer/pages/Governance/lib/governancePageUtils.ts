import { type CompletedReferendum, type OngoingReferendum } from '@/shared/core';
import { nonNullable, nullable, performSearch } from '@/shared/lib/utils';
import { referendumService } from '@/entities/governance';
import { type AggregatedReferendum } from '@/features/governance';

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
  const res = performSearch<AggregatedReferendum>({
    records: referendums,
    query,
    weights: {
      title: 1,
      referendumId: 0.5,
    },
  });

  return res as T[];
}

type FilterByVoteParams = {
  referendum: AggregatedReferendum;
  selectedVoteId: null | 'voted' | 'notVoted';
};

function isReferendumVoted({ selectedVoteId, referendum }: FilterByVoteParams) {
  if (!selectedVoteId) {
    return true;
  }

  if (selectedVoteId === 'voted') {
    return referendum.voting.votes.length > 0 || nonNullable(referendum.votedByDelegate);
  }

  return referendum.voting.votes.length === 0 && nullable(referendum.votedByDelegate);
}

function isReferendumInTrack(selectedTrackIds: string[], referendum: AggregatedReferendum) {
  if (!selectedTrackIds?.length) {
    return true;
  }

  if (!isAggregatedReferendumOngoing(referendum)) {
    return false;
  }

  return selectedTrackIds.includes(referendum.track);
}

function isAggregatedReferendumOngoing(r: AggregatedReferendum): r is AggregatedReferendum<OngoingReferendum> {
  return referendumService.isOngoing(r);
}

function isAggregatedReferendumCompleted(r: AggregatedReferendum): r is AggregatedReferendum<CompletedReferendum> {
  return referendumService.isCompleted(r);
}
