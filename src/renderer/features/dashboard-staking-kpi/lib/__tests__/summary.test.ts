import { type AccountId } from '@/shared/polkadotjs-schemas';
import { filterPositionsByAccounts, summarizePositions, withdrawablePositions } from '../summary';

import { ALICE, BOB, KUSAMA, POLKADOT, makePosition } from './fixtures';

const VAL_A = '0xvalA' as AccountId;
const VAL_B = '0xvalB' as AccountId;

describe('account scoping', () => {
  test('keeps only positions of the picked accounts', () => {
    const positions = [makePosition({ accountId: ALICE }), makePosition({ accountId: BOB })];

    expect(filterPositionsByAccounts(positions, [ALICE])).toHaveLength(1);
  });

  test('an empty picker keeps nothing', () => {
    expect(filterPositionsByAccounts([makePosition()], [])).toEqual([]);
  });
});

describe('summary over a subset', () => {
  test('planck is summed per chain and never across assets', () => {
    const summary = summarizePositions([
      makePosition({ chainId: POLKADOT, total: '100', redeemable: '10', totalUnbonding: '20' }),
      makePosition({ chainId: POLKADOT, accountId: BOB, total: '50' }),
      makePosition({ chainId: KUSAMA, total: '7' }),
    ]);

    expect(summary.byChain[POLKADOT]?.totalStaked).toBe('150');
    expect(summary.byChain[POLKADOT]?.redeemable).toBe('10');
    expect(summary.byChain[POLKADOT]?.totalUnbonding).toBe('20');
    expect(summary.byChain[KUSAMA]?.totalStaked).toBe('7');
    expect(summary.positionCount).toBe(3);
  });

  test('the same validator on two chains counts twice', () => {
    const summary = summarizePositions([
      makePosition({ chainId: POLKADOT, activeValidators: [VAL_A, VAL_B] }),
      makePosition({ chainId: KUSAMA, activeValidators: [VAL_A] }),
    ]);

    expect(summary.byChain[POLKADOT]?.activeValidatorCount).toBe(2);
    expect(summary.byChain[KUSAMA]?.activeValidatorCount).toBe(1);
    expect(summary.activeValidatorCount).toBe(3);
  });

  test('a validator shared by two positions of one chain counts once', () => {
    const summary = summarizePositions([
      makePosition({ chainId: POLKADOT, accountId: ALICE, activeValidators: [VAL_A] }),
      makePosition({ chainId: POLKADOT, accountId: BOB, activeValidators: [VAL_A] }),
    ]);

    expect(summary.activeValidatorCount).toBe(1);
  });

  test('only active positions count as earning', () => {
    const summary = summarizePositions([
      makePosition({ status: 'active' }),
      makePosition({ accountId: BOB, status: 'inactive' }),
    ]);

    expect(summary.positionCount).toBe(2);
    expect(summary.earningPositionCount).toBe(1);
  });

  test('an empty selection summarizes to zeroes, not to undefined', () => {
    const summary = summarizePositions([]);

    expect(summary).toEqual({
      chains: [],
      byChain: {},
      activeValidatorCount: 0,
      positionCount: 0,
      earningPositionCount: 0,
    });
  });
});

describe('withdrawable positions', () => {
  test('are the ones with a matured chunk', () => {
    const positions = [makePosition({ redeemable: '0' }), makePosition({ accountId: BOB, redeemable: '5' })];

    expect(withdrawablePositions(positions)).toHaveLength(1);
  });
});
