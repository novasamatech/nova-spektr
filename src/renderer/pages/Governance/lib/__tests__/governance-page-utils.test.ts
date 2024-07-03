import { ChainId, OngoingReferendum, ReferendumId, VotingMap, VotingType } from '@shared/core';
import { VoteStatus, referendumListUtils } from '@features/governance';
import { governancePageUtils } from '../governance-page-utils';

describe('page/governance/lib/governance-page-utils', () => {
  const chainId = '0x1';
  const referendums = new Map([
    ['111', {}],
    ['222', {}],
  ]);
  const details: Record<ChainId, Record<ReferendumId, string>> = {
    '0x1': {
      111: 'Referendum Title 1',
      222: 'Referendum Title 2',
    },
  };

  const key = '111';
  const voting: VotingMap = {
    '123': { '1': { type: VotingType.CASTING } },
  };

  const referendum = {
    track: '1',
  } as OngoingReferendum;

  test('should return all referendums if query is empty', () => {
    const query = '';
    const result = governancePageUtils.filteredByQuery({ referendums, query, details, chainId });
    expect(result).toEqual(referendums);
  });

  test('should return referendums that match the query in the ID', () => {
    const query = '111';
    const result = governancePageUtils.filteredByQuery({ referendums, query, details, chainId });
    expect(result.size).toEqual(1);
    expect(result.has('111')).toEqual(true);
  });

  test('should return referendums that match the query in the title', () => {
    const query = 'Title 2';
    const result = governancePageUtils.filteredByQuery({ referendums, query, details, chainId });
    expect(result.size).toEqual(1);
    expect(result.has('222')).toEqual(true);
  });

  test('should return an empty map if no referendums match the query', () => {
    const query = 'none';
    const result = governancePageUtils.filteredByQuery({ referendums, query, details, chainId });
    expect(result.size).toEqual(0);
  });

  test('should return true if selectedVoteId is VOTED and referendum is voted', () => {
    jest.spyOn(referendumListUtils, 'isReferendumVoted').mockReturnValue(true);
    const result = governancePageUtils.filterByVote({ selectedVoteId: VoteStatus.VOTED, key, voting });
    expect(result).toEqual(true);
  });

  test('should return false if selectedVoteId is VOTED and referendum is not voted', () => {
    jest.spyOn(referendumListUtils, 'isReferendumVoted').mockReturnValue(false);
    const result = governancePageUtils.filterByVote({ selectedVoteId: VoteStatus.VOTED, key, voting });
    expect(result).toEqual(false);
  });

  test('should return false if selectedVoteId is not VOTED and referendum is voted', () => {
    jest.spyOn(referendumListUtils, 'isReferendumVoted').mockReturnValue(true);
    const result = governancePageUtils.filterByVote({ selectedVoteId: VoteStatus.NOT_VOTED, key, voting });
    expect(result).toEqual(false);
  });

  test('should return true if selectedVoteId is not VOTED and referendum is not voted', () => {
    jest.spyOn(referendumListUtils, 'isReferendumVoted').mockReturnValue(false);
    const result = governancePageUtils.filterByVote({ selectedVoteId: VoteStatus.NOT_VOTED, key, voting });
    expect(result).toEqual(true);
  });

  test('should return true if selectedTrackIds is empty', () => {
    const result = governancePageUtils.filterByTracks([], referendum);
    expect(result).toEqual(true);
  });

  test('should return true if referendum track is in selectedTrackIds', () => {
    const result = governancePageUtils.filterByTracks(['0', '1'], referendum);
    expect(result).toEqual(true);
  });

  test('should return false if referendum track is not in selectedTrackIds', () => {
    const result = governancePageUtils.filterByTracks(['999'], referendum);
    expect(result).toEqual(false);
  });
});
