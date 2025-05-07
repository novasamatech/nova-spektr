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
});
