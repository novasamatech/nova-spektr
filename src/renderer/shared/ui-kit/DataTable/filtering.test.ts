import { describe, expect, test } from 'vitest';

import {
  countActiveFilters,
  emptyFilterState,
  enumOptions,
  filterRows,
  isColumnFiltered,
  searchRows,
  sortRows,
} from './filtering';
import { type DataTableColumn } from './types';

type Row = {
  id: string;
  name: string;
  chain: string;
  staked: number | null;
};

const rows: Row[] = [
  { id: '1', name: 'Treasury', chain: 'Polkadot Asset Hub', staked: 300 },
  { id: '2', name: 'Ops wallet', chain: 'Kusama Asset Hub', staked: 100 },
  { id: '3', name: 'Cold storage', chain: 'Polkadot Asset Hub', staked: null },
];

const columns: DataTableColumn<Row>[] = [
  { id: 'name', title: 'Account', filter: 'text', sortable: true, text: r => r.name, render: r => r.name },
  { id: 'chain', title: 'Chain', filter: 'enum', sortable: true, text: r => r.chain, render: r => r.chain },
  {
    id: 'staked',
    title: 'Staked',
    filter: 'range',
    sortable: true,
    text: r => (r.staked === null ? '—' : String(r.staked)),
    value: r => r.staked,
    render: r => r.staked,
  },
  { id: 'actions', title: '', decorative: true, render: () => null },
];

const ids = (list: Row[]) => list.map(r => r.id);

describe('enumOptions', () => {
  test('lists the distinct rendered values alphabetically', () => {
    expect(enumOptions(rows, columns[1]!)).toEqual(['Kusama Asset Hub', 'Polkadot Asset Hub']);
  });
});

describe('searchRows', () => {
  test('keeps the source order instead of re-ranking by match weight', () => {
    expect(ids(searchRows(rows, columns, 'o'))).toEqual(['1', '2', '3']);
  });

  test('matches any column the user can read', () => {
    expect(ids(searchRows(rows, columns, 'kusama'))).toEqual(['2']);
    expect(ids(searchRows(rows, columns, 'cold'))).toEqual(['3']);
  });

  test('an empty query filters nothing', () => {
    expect(searchRows(rows, columns, '   ')).toBe(rows);
  });
});

describe('filterRows', () => {
  test('no active filter returns the same array', () => {
    expect(filterRows(rows, columns, emptyFilterState())).toBe(rows);
  });

  test('text filter is a case-insensitive substring of the rendered string', () => {
    const state = { ...emptyFilterState(), text: { name: 'trea' } };

    expect(ids(filterRows(rows, columns, state))).toEqual(['1']);
  });

  test('enum filter keeps only the ticked values', () => {
    const state = { ...emptyFilterState(), enum: { chain: ['Kusama Asset Hub'] } };

    expect(ids(filterRows(rows, columns, state))).toEqual(['2']);
  });

  test('range filter honours each bound independently', () => {
    expect(
      ids(filterRows(rows, columns, { ...emptyFilterState(), range: { staked: { min: 200, max: null } } })),
    ).toEqual(['1']);
    expect(
      ids(filterRows(rows, columns, { ...emptyFilterState(), range: { staked: { min: null, max: 200 } } })),
    ).toEqual(['2']);
  });

  test('a row whose value is unknown never satisfies a bound', () => {
    const state = { ...emptyFilterState(), range: { staked: { min: null, max: 1000 } } };

    expect(ids(filterRows(rows, columns, state))).not.toContain('3');
  });

  test('filters compose', () => {
    const state = {
      ...emptyFilterState(),
      enum: { chain: ['Polkadot Asset Hub'] },
      range: { staked: { min: 200, max: null } },
    };

    expect(ids(filterRows(rows, columns, state))).toEqual(['1']);
  });
});

describe('sortRows', () => {
  test('sorts numerically when the column carries a value', () => {
    expect(ids(sortRows(rows, columns, { column: 'staked', direction: 'asc' }))).toEqual(['2', '1', '3']);
  });

  test('unknown values sort last in both directions', () => {
    expect(ids(sortRows(rows, columns, { column: 'staked', direction: 'desc' }))).toEqual(['1', '2', '3']);
  });

  test('falls back to the rendered string when there is no numeric value', () => {
    expect(ids(sortRows(rows, columns, { column: 'name', direction: 'asc' }))).toEqual(['3', '2', '1']);
  });

  test('a non-sortable or unknown column leaves the order alone', () => {
    expect(sortRows(rows, columns, { column: 'actions', direction: 'asc' })).toBe(rows);
    expect(sortRows(rows, columns, null)).toBe(rows);
  });

  /**
   * A column that compares as big integers (planck amounts run past
   * `Number.MAX_SAFE_INTEGER`) still has to sink its unknowns in both
   * directions — multiplying the comparator's own null sentinel by the sort
   * direction floated every `—` row to the top of a descending sort.
   */
  test('unknown values sort last in both directions on a compare column', () => {
    const compareColumns: DataTableColumn<Row>[] = [
      {
        id: 'staked',
        title: 'Staked',
        sortable: true,
        text: r => (r.staked === null ? '—' : String(r.staked)),
        value: r => r.staked,
        // The same shape as the real planck comparator: a direction-independent
        // sentinel for the unknown side, which is exactly what breaks when the
        // caller multiplies the result by the sort direction.
        compare: (a, b) => {
          if (a.staked === null && b.staked === null) return 0;
          if (a.staked === null) return 1;
          if (b.staked === null) return -1;

          return a.staked - b.staked;
        },
        render: r => r.staked,
      },
    ];

    expect(ids(sortRows(rows, compareColumns, { column: 'staked', direction: 'asc' }))).toEqual(['2', '1', '3']);
    expect(ids(sortRows(rows, compareColumns, { column: 'staked', direction: 'desc' }))).toEqual(['1', '2', '3']);
  });
});

describe('filter bookkeeping', () => {
  test('counts each narrowed column once', () => {
    const state = {
      text: { name: 'a', chain: '  ' },
      enum: { chain: [] as string[] },
      range: { staked: { min: 1, max: null } },
    };

    expect(countActiveFilters(state)).toBe(2);
  });

  test('reports which column is narrowed', () => {
    const state = { ...emptyFilterState(), enum: { chain: ['Kusama Asset Hub'] } };

    expect(isColumnFiltered(state, columns[1]!)).toBe(true);
    expect(isColumnFiltered(state, columns[0]!)).toBe(false);
    expect(isColumnFiltered(state, columns[3]!)).toBe(false);
  });
});
