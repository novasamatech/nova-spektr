import { calculateVoteWeightPipeline } from '../configuration/inject';

import { trackService } from './service';

describe('track service', () => {
  afterEach(() => {
    calculateVoteWeightPipeline.resetHandlers();
  });

  it.each([
    { rank: 1, track: 1, expected: 0 },
    { rank: 7, track: 11, expected: 4 },
    { rank: 7, track: 21, expected: 4 },
    { rank: 7, track: 31, expected: 4 },
  ])('should correctly calculate excess rank: rank = $rank, track = $track', ({ rank, track, expected }) => {
    const maxRank = 9;
    expect(trackService.getExcessRank(rank, maxRank, track)).toEqual(expected);
  });

  it('should correctly calculate vote weight', () => {
    calculateVoteWeightPipeline.registerHandler({
      available: () => true,
      body: (_, { excessRank }) => trackService.getGeometricVoteWeight(excessRank),
    });

    const maxRank = 9;
    const rank = 7;
    const track = 21;

    const voteWeight = trackService.getVoteWeight({
      pallet: 'fellowship',
      maxRank,
      rank,
      track,
    });

    expect(voteWeight).toEqual(15);
  });

  describe('getRankFromTrackId', () => {
    it.each([
      { trackId: 11, expected: 1, description: 'retention track 11 (retain at I Dan)' },
      { trackId: 12, expected: 2, description: 'retention track 12 (retain at II Dan)' },
      { trackId: 16, expected: 6, description: 'retention track 16' },
      { trackId: 21, expected: 1, description: 'regular promotion track 21 (promote to I Dan)' },
      { trackId: 22, expected: 2, description: 'regular promotion track 22 (promote to II Dan)' },
      { trackId: 26, expected: 6, description: 'regular promotion track 26' },
      { trackId: 31, expected: 1, description: 'fast promotion track 31 (fast promote to I Dan)' },
      { trackId: 33, expected: 3, description: 'fast promotion track 33 (fast promote to III Dan)' },
      { trackId: 36, expected: 6, description: 'fast promotion track 36' },
    ])('returns $expected for $description', ({ trackId, expected }) => {
      expect(trackService.getRankFromTrackId(trackId)).toEqual(expected);
    });

    it('returns 0 for non-promotion/retention tracks', () => {
      expect(trackService.getRankFromTrackId(0)).toEqual(0);
      expect(trackService.getRankFromTrackId(5)).toEqual(0);
    });
  });
});
