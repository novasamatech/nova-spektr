import { ChainId, OngoingReferendum, ReferendumId, VotingMap } from '@shared/core';
import { includes } from '@shared/lib/utils';
import { VoteStatus, referendumListUtils } from '@features/governance';

type ReferendumMap<T> = Map<ReferendumId, T>;

export const governancePageUtils = {
  filteredByQuery,
  filterByVote,
  filterByTracks,
};

type FilteredByQueryProps<T> = {
  referendums: ReferendumMap<T>;
  query: string;
  details: Record<ChainId, Record<ReferendumId, string>>;
  chainId?: ChainId;
};

function filteredByQuery<T>({ referendums, query, details, chainId }: FilteredByQueryProps<T>): ReferendumMap<T> {
  if (!query || !chainId || referendums.size === 0) return referendums;

  const filteredReferendums = Array.from(referendums.entries()).filter(([key]) => {
    const title = details[chainId]?.[key];
    const hasIndex = includes(key, query);
    const hasTitle = includes(title, query);

    return hasIndex || hasTitle;
  });

  return new Map(filteredReferendums);
}

type FilterByVoteProps = {
  selectedVoteId: string;
  voting: VotingMap;
  key: string;
};

function filterByVote({ selectedVoteId, key, voting }: FilterByVoteProps) {
  if (!selectedVoteId) return true;

  const isReferendumVoted = referendumListUtils.isReferendumVoted(key, voting);

  return selectedVoteId === VoteStatus.VOTED ? isReferendumVoted : !isReferendumVoted;
}

function filterByTracks(selectedTrackIds: string[], referendum: OngoingReferendum) {
  if (!selectedTrackIds?.length) return true;

  return selectedTrackIds.includes(referendum.track);
}
