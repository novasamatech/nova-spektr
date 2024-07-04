import { OngoingReferendum, Referendum, ReferendumId, ReferendumType, VotingMap, VotingType } from '@shared/core';
import { VoteStatus } from '@features/governance';
import { votingService } from '@entities/governance';
import { governancePageUtils } from '../governance-page-utils';

describe('page/governance/lib/governance-page-utils', () => {
  const referendums: Referendum[] = [
    { referendumId: '111', type: ReferendumType.Approved, since: 0 },
    { referendumId: '222', type: ReferendumType.Approved, since: 0 },
  ];
  const details: Record<ReferendumId, string> = {
    111: 'Referendum Title 1',
    222: 'Referendum Title 2',
  };

  const referendumId = '111';
  const voting: VotingMap = {
    '123': { '1': { type: VotingType.CASTING } },
  };

  const referendum = {
    type: ReferendumType.Ongoing,
    track: '1',
  } as OngoingReferendum;

  test.each([
    { referendums, details, query: '', expected: referendums },
    { referendums, details, query: '111', expected: referendums.filter((x) => x.referendumId === '111') },
    { referendums, details, query: '222', expected: referendums.filter((x) => x.referendumId === '222') },
    { referendums, details, query: 'none', expected: [] },
  ])('should return correct referendums if query is "$query"', ({ referendums, query, details, expected }) => {
    const result = governancePageUtils.filteredByQuery({ referendums, query, details });
    expect(result).toEqual(expected);
  });

  test('should return true if selectedVoteId is VOTED and referendum is voted', () => {
    jest.spyOn(votingService, 'isReferendumVoted').mockReturnValue(true);
    const result = governancePageUtils.filterByVote({ selectedVoteId: VoteStatus.VOTED, referendumId, voting });
    expect(result).toEqual(true);
  });

  test('should return false if selectedVoteId is VOTED and referendum is not voted', () => {
    jest.spyOn(votingService, 'isReferendumVoted').mockReturnValue(false);
    const result = governancePageUtils.filterByVote({ selectedVoteId: VoteStatus.VOTED, referendumId, voting });
    expect(result).toEqual(false);
  });

  test('should return false if selectedVoteId is not VOTED and referendum is voted', () => {
    jest.spyOn(votingService, 'isReferendumVoted').mockReturnValue(true);
    const result = governancePageUtils.filterByVote({ selectedVoteId: VoteStatus.NOT_VOTED, referendumId, voting });
    expect(result).toEqual(false);
  });

  test('should return true if selectedVoteId is not VOTED and referendum is not voted', () => {
    jest.spyOn(votingService, 'isReferendumVoted').mockReturnValue(false);
    const result = governancePageUtils.filterByVote({ selectedVoteId: VoteStatus.NOT_VOTED, referendumId, voting });
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
