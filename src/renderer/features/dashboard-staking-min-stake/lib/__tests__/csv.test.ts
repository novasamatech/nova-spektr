import { buildCsv } from '@/shared/lib/csv';
import { type MinStakeRow } from '../../hooks/useMinStakeRows';
import { type CsvMinStakeRow, minStakeCsvColumns } from '../csv';

const HEADERS = {
  network: 'Network',
  era: 'Era',
  date: 'Date',
  minStake: 'Min stake',
  change: 'Change',
  validators: 'Validators',
};

const row = (era: number, minStake: string): MinStakeRow => ({
  era,
  minStake,
  tokens: 0,
  validatorCount: 600,
  dateMs: null,
  isActive: false,
});

describe('minStakeCsvColumns', () => {
  test('should export full-precision tokens and a signed change against the previous era', () => {
    const first = row(2258, '11499830000000000');
    const second = row(2259, '11524100000000000');
    const rows: CsvMinStakeRow[] = [
      { row: first, previous: undefined, chainName: 'Polkadot Asset Hub', precision: 10, date: 'Aug 11' },
      { row: second, previous: first, chainName: 'Polkadot Asset Hub', precision: 10, date: 'Aug 12' },
    ];

    expect(buildCsv(minStakeCsvColumns(HEADERS), rows).split('\r\n')).toEqual([
      'Network,Era,Date,Min stake,Change,Validators',
      'Polkadot Asset Hub,2258,Aug 11,1149983,,600',
      'Polkadot Asset Hub,2259,Aug 12,1152410,2427,600',
    ]);
  });
});
