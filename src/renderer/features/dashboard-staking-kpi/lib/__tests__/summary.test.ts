import { filterPositionsByAccounts, withdrawablePositions } from '../summary';

import { ALICE, BOB, makePosition } from './fixtures';

describe('account scoping', () => {
  test('keeps only positions of the picked accounts', () => {
    const positions = [makePosition({ accountId: ALICE }), makePosition({ accountId: BOB })];

    expect(filterPositionsByAccounts(positions, [ALICE])).toHaveLength(1);
  });

  test('an empty picker keeps nothing', () => {
    expect(filterPositionsByAccounts([makePosition()], [])).toEqual([]);
  });
});

describe('withdrawable positions', () => {
  test('are the ones with a matured chunk', () => {
    const positions = [makePosition({ redeemable: '0' }), makePosition({ accountId: BOB, redeemable: '5' })];

    expect(withdrawablePositions(positions)).toHaveLength(1);
  });
});
