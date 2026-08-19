import { type AccountId } from '@/shared/polkadotjs-schemas';
import { DEFAULT_NOMINATION_SORT, isNominationSortColumn, sortNominationRows } from '../nomination-sorting';
import { type NominationRow } from '../types';

function createRow(id: string, overrides: Partial<NominationRow> = {}): NominationRow {
  return {
    accountId: `0x${id}` as AccountId,
    status: 'active',
    ourStake: '0',
    commission: 0,
    apy: 10,
    eraPoints: 100,
    ...overrides,
  };
}

const keys = (rows: NominationRow[]) => rows.map((row) => row.accountId);

describe('sortNominationRows', () => {
  describe('status', () => {
    test('should put earning nominations first, then dropped out, then not elected', () => {
      const rows = [
        createRow('waiting', { status: 'waiting' }),
        createRow('dropped', { status: 'droppedOut' }),
        createRow('active', { status: 'active' }),
      ];

      expect(keys(sortNominationRows(rows, 'status', 'asc'))).toEqual(['0xactive', '0xdropped', '0xwaiting']);
    });

    test('should default to that order', () => {
      expect(DEFAULT_NOMINATION_SORT).toEqual({ column: 'status', direction: 'asc' });
    });

    test('should break ties on stake, biggest first, in both directions', () => {
      const rows = [
        createRow('small', { ourStake: '100' }),
        createRow('big', { ourStake: '900' }),
        createRow('medium', { ourStake: '500' }),
      ];

      expect(keys(sortNominationRows(rows, 'status', 'asc'))).toEqual(['0xbig', '0xmedium', '0xsmall']);
      expect(keys(sortNominationRows(rows, 'status', 'desc'))).toEqual(['0xbig', '0xmedium', '0xsmall']);
    });
  });

  describe('ourStake', () => {
    test('should compare in planck rather than as numbers', () => {
      // Both parse to the same `Number`; only a BN comparison tells them apart.
      const rows = [
        createRow('lower', { ourStake: '9007199254740993' }),
        createRow('higher', { ourStake: '9007199254740995' }),
      ];

      expect(keys(sortNominationRows(rows, 'ourStake', 'desc'))).toEqual(['0xhigher', '0xlower']);
    });

    test('should read a validator that exposes nothing of ours as zero', () => {
      const rows = [createRow('none', { ourStake: null }), createRow('some', { ourStake: '1' })];

      expect(keys(sortNominationRows(rows, 'ourStake', 'desc'))).toEqual(['0xsome', '0xnone']);
      expect(keys(sortNominationRows(rows, 'ourStake', 'asc'))).toEqual(['0xnone', '0xsome']);
    });
  });

  describe('nullable numbers', () => {
    test('should sink an unknown value in both directions', () => {
      const rows = [
        createRow('unknown', { eraPoints: null }),
        createRow('low', { eraPoints: 1 }),
        createRow('high', { eraPoints: 9 }),
      ];

      expect(keys(sortNominationRows(rows, 'eraPoints', 'desc'))).toEqual(['0xhigh', '0xlow', '0xunknown']);
      expect(keys(sortNominationRows(rows, 'eraPoints', 'asc'))).toEqual(['0xlow', '0xhigh', '0xunknown']);
    });

    test('should order apy the same way', () => {
      const rows = [createRow('none', { apy: null }), createRow('low', { apy: 2 }), createRow('high', { apy: 8 })];

      expect(keys(sortNominationRows(rows, 'apy', 'desc'))).toEqual(['0xhigh', '0xlow', '0xnone']);
    });
  });

  test('should not mutate the input', () => {
    const rows = [createRow('b', { eraPoints: 1 }), createRow('a', { eraPoints: 9 })];
    const before = keys(rows);

    sortNominationRows(rows, 'eraPoints', 'desc');

    expect(keys(rows)).toEqual(before);
  });
});

describe('isNominationSortColumn', () => {
  test('should accept the sortable columns only', () => {
    expect(isNominationSortColumn('status')).toBe(true);
    expect(isNominationSortColumn('ourStake')).toBe(true);
    expect(isNominationSortColumn('apy')).toBe(true);
    expect(isNominationSortColumn('eraPoints')).toBe(true);
    expect(isNominationSortColumn('accountId')).toBe(false);
    expect(isNominationSortColumn('commission')).toBe(false);
  });
});
