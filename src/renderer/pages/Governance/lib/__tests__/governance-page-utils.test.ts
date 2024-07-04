import { OngoingReferendum, ReferendumType, VotingMap, VotingType } from '@shared/core';
import { AggregatedReferendum, VoteStatus } from '@features/governance';
import { votingService } from '@entities/governance';
import { governancePageUtils } from '../governance-page-utils';

describe('page/governance/lib/governance-page-utils', () => {
  const referendums: AggregatedReferendum[] = [
    {
      referendum: { referendumId: '111', type: ReferendumType.Approved, since: 0 },
      title: 'Referendum Title 1',
      approvalThreshold: null,
      supportThreshold: null,
    },
    {
      referendum: { referendumId: '222', type: ReferendumType.Approved, since: 0 },
      title: 'Referendum Title 2',
      approvalThreshold: null,
      supportThreshold: null,
    },
  ];

  const referendumId = '111';
  const voting: VotingMap = {
    '123': { '1': { type: VotingType.CASTING } },
  };

  const referendum = {
    type: ReferendumType.Ongoing,
    track: '1',
  } as OngoingReferendum;

  test.each([
    { referendums, query: '', expected: referendums },
    { referendums, query: '111', expected: referendums.filter(({ referendum }) => referendum.referendumId === '111') },
    { referendums, query: '222', expected: referendums.filter(({ referendum }) => referendum.referendumId === '222') },
    { referendums, query: 'none', expected: [] },
  ])('should return correct referendums if query is "$query"', ({ referendums, query, expected }) => {
    const result = governancePageUtils.filteredByQuery({ referendums, query });
    expect(result).toEqual(expected);
  });

  test('should return true if selectedVoteId is VOTED and referendum is voted', () => {
    jest.spyOn(votingService, 'isReferendumVoted').mockReturnValue(true);
    const result = governancePageUtils.isReferendumVoted({ selectedVoteId: VoteStatus.VOTED, referendumId, voting });
    expect(result).toEqual(true);
  });

  test('should return false if selectedVoteId is VOTED and referendum is not voted', () => {
    jest.spyOn(votingService, 'isReferendumVoted').mockReturnValue(false);
    const result = governancePageUtils.isReferendumVoted({ selectedVoteId: VoteStatus.VOTED, referendumId, voting });
    expect(result).toEqual(false);
  });

  test('should return false if selectedVoteId is not VOTED and referendum is voted', () => {
    jest.spyOn(votingService, 'isReferendumVoted').mockReturnValue(true);
    const result = governancePageUtils.isReferendumVoted({
      selectedVoteId: VoteStatus.NOT_VOTED,
      referendumId,
      voting,
    });
    expect(result).toEqual(false);
  });

  test('should return true if selectedVoteId is not VOTED and referendum is not voted', () => {
    jest.spyOn(votingService, 'isReferendumVoted').mockReturnValue(false);
    const result = governancePageUtils.isReferendumVoted({
      selectedVoteId: VoteStatus.NOT_VOTED,
      referendumId,
      voting,
    });
    expect(result).toEqual(true);
  });

  test('should return true if selectedTrackIds is empty', () => {
    const result = governancePageUtils.isReferendumInTrack([], referendum);
    expect(result).toEqual(true);
  });

  test('should return true if referendum track is in selectedTrackIds', () => {
    const result = governancePageUtils.isReferendumInTrack(['0', '1'], referendum);
    expect(result).toEqual(true);
  });

  test('should return false if referendum track is not in selectedTrackIds', () => {
    const result = governancePageUtils.isReferendumInTrack(['999'], referendum);
    expect(result).toEqual(false);
  });
});
