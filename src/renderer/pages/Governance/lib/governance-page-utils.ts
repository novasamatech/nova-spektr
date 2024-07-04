import { Referendum, ReferendumId, VotingMap } from '@shared/core';
import { includes } from '@shared/lib/utils';
import { VoteStatus } from '@features/governance';
import { referendumUtils, votingService } from '@entities/governance';

export const governancePageUtils = {
  filteredByQuery,
  filterByVote,
  filterByTracks,
};

type FilteredByQueryParams<T extends Referendum> = {
  referendums: T[];
  query: string;
  details: Record<ReferendumId, string>;
};

function filteredByQuery<T extends Referendum>({ referendums, query, details }: FilteredByQueryParams<T>): T[] {
  if (!query) {
    return referendums;
  }

  return referendums.filter(({ referendumId }) => {
    const title = details[referendumId];
    const hasIndex = includes(referendumId, query);
    const hasTitle = includes(title, query);

    return hasIndex || hasTitle;
  });
}

type FilterByVoteParams = {
  referendumId: ReferendumId;
  selectedVoteId: string;
  voting: VotingMap;
};

function filterByVote({ selectedVoteId, referendumId, voting }: FilterByVoteParams) {
  if (!selectedVoteId) {
    return true;
  }

  const isReferendumVoted = votingService.isReferendumVoted(referendumId, voting);

  return selectedVoteId === VoteStatus.VOTED ? isReferendumVoted : !isReferendumVoted;
}

function filterByTracks(selectedTrackIds: string[], referendum: Referendum) {
  if (!selectedTrackIds?.length) {
    return true;
  }

  if (!referendumUtils.isOngoing(referendum)) {
    return false;
  }

  return selectedTrackIds.includes(referendum.track);
}
