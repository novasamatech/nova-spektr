export const utils = {
  test,
};

const enum Vote {
  Nay = 'nay',
  Aye = 'aye',
}

// Convert aye nay to on-chain values
function test(vote: Vote, conviction: number): number | undefined {
  const VotesMap: Record<Vote, Record<string, number>> = {
    [Vote.Nay]: { '0.1': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6 },
    [Vote.Aye]: { '0.1': 128, '1': 129, '2': 130, '3': 131, '4': 132, '5': 133, '6': 134 },
  };

  return VotesMap[vote][conviction.toString()];
}
