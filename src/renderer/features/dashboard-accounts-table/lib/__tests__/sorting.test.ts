import { type Chain } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { DEFAULT_SORT, nextSort, sortGroups, sortRows } from '../sorting';
import { type AccountGroup, type TableSortState } from '../types';

import { makeRow } from './fixtures';

const ALICE = toAccountId('0x' + '11'.repeat(32));

const makeGroup = (overrides: Partial<AccountGroup> & { key: string }): AccountGroup => {
  return {
    key: overrides.key,
    accountId: overrides.accountId ?? ALICE,
    name: overrides.name ?? overrides.key,
    wallet: overrides.wallet ?? null,
    walletTypeBucket: overrides.walletTypeBucket ?? 'vault',
    rows: overrides.rows ?? [],
    subtotalFiat: overrides.subtotalFiat ?? null,
  };
};

describe('DEFAULT_SORT', () => {
  it('sorts by total descending', () => {
    expect(DEFAULT_SORT).toEqual<TableSortState>({ key: 'total', dir: 'desc' });
  });
});

describe('nextSort', () => {
  it('toggles desc to asc for the same key', () => {
    expect(nextSort({ key: 'total', dir: 'desc' }, 'total')).toEqual({ key: 'total', dir: 'asc' });
  });

  it('toggles asc to desc for the same key', () => {
    expect(nextSort({ key: 'total', dir: 'asc' }, 'total')).toEqual({ key: 'total', dir: 'desc' });
  });

  it('starts a new chain key ascending', () => {
    expect(nextSort({ key: 'total', dir: 'desc' }, 'chain')).toEqual({ key: 'chain', dir: 'asc' });
  });

  it('starts a new numeric key descending', () => {
    expect(nextSort({ key: 'chain', dir: 'asc' }, 'staked')).toEqual({ key: 'staked', dir: 'desc' });
  });
});

describe('sortRows', () => {
  const rowAcala = makeRow({ accountId: ALICE, chain: { chainId: '0x1', name: 'Acala' } as unknown as Chain });
  const rowKusama = makeRow({ accountId: ALICE, chain: { chainId: '0x2', name: 'Kusama' } as unknown as Chain });
  const rowPolkadot = makeRow({ accountId: ALICE, chain: { chainId: '0x3', name: 'Polkadot' } as unknown as Chain });
  const chainRows = [rowKusama, rowAcala, rowPolkadot];

  it('sorts by chain name ascending', () => {
    const result = sortRows(chainRows, { key: 'chain', dir: 'asc' });

    expect(result.map((r) => r.chain.name)).toEqual(['Acala', 'Kusama', 'Polkadot']);
  });

  it('sorts by chain name descending', () => {
    const result = sortRows(chainRows, { key: 'chain', dir: 'desc' });

    expect(result.map((r) => r.chain.name)).toEqual(['Polkadot', 'Kusama', 'Acala']);
  });

  it('sorts by a numeric fiat key', () => {
    const rowLow = makeRow({
      id: 'low',
      accountId: ALICE,
      fiat: { transferable: null, staked: 10, governance: null, other: null, total: 10 },
    });
    const rowHigh = makeRow({
      id: 'high',
      accountId: ALICE,
      fiat: { transferable: null, staked: 100, governance: null, other: null, total: 100 },
    });
    const rows = [rowLow, rowHigh];

    expect(sortRows(rows, { key: 'staked', dir: 'desc' }).map((r) => r.id)).toEqual(['high', 'low']);
    expect(sortRows(rows, { key: 'staked', dir: 'asc' }).map((r) => r.id)).toEqual(['low', 'high']);
  });

  it('treats null fiat as -Infinity, sinking to the bottom on desc', () => {
    const rowNull = makeRow({
      id: 'null',
      accountId: ALICE,
      fiat: { transferable: null, staked: null, governance: null, other: null, total: null },
    });
    const rowValue = makeRow({
      id: 'value',
      accountId: ALICE,
      fiat: { transferable: null, staked: null, governance: null, other: null, total: 5 },
    });
    const rows = [rowNull, rowValue];

    expect(sortRows(rows, { key: 'total', dir: 'desc' }).map((r) => r.id)).toEqual(['value', 'null']);
  });

  it('treats null fiat as -Infinity, rising to the top on asc', () => {
    const rowNull = makeRow({
      id: 'null',
      accountId: ALICE,
      fiat: { transferable: null, staked: null, governance: null, other: null, total: null },
    });
    const rowValue = makeRow({
      id: 'value',
      accountId: ALICE,
      fiat: { transferable: null, staked: null, governance: null, other: null, total: 5 },
    });
    const rows = [rowValue, rowNull];

    expect(sortRows(rows, { key: 'total', dir: 'asc' }).map((r) => r.id)).toEqual(['null', 'value']);
  });

  it('does not mutate the input array', () => {
    const original = [...chainRows];

    sortRows(chainRows, { key: 'chain', dir: 'desc' });

    expect(chainRows).toEqual(original);
  });

  it('is stable for equal values', () => {
    const rowFirst = makeRow({
      id: 'first',
      accountId: ALICE,
      fiat: { transferable: null, staked: null, governance: null, other: null, total: 50 },
    });
    const rowSecond = makeRow({
      id: 'second',
      accountId: ALICE,
      fiat: { transferable: null, staked: null, governance: null, other: null, total: 50 },
    });
    const rows = [rowFirst, rowSecond];

    expect(sortRows(rows, { key: 'total', dir: 'desc' }).map((r) => r.id)).toEqual(['first', 'second']);
    expect(sortRows(rows, { key: 'total', dir: 'asc' }).map((r) => r.id)).toEqual(['first', 'second']);
  });
});

describe('sortGroups', () => {
  const BY_TOTAL: TableSortState = { key: 'total', dir: 'desc' };

  const groupLow = makeGroup({ key: 'low', name: 'Bravo', subtotalFiat: 10 });
  const groupHigh = makeGroup({ key: 'high', name: 'Alpha', subtotalFiat: 100 });
  const groupNull = makeGroup({ key: 'null', name: 'Charlie', subtotalFiat: null });
  const groups = [groupLow, groupNull, groupHigh];

  it('sorts by subtotalFiat descending with null last', () => {
    expect(sortGroups(groups, BY_TOTAL).map((g) => g.key)).toEqual(['high', 'low', 'null']);
  });

  it('does not mutate the input array', () => {
    const original = [...groups];

    sortGroups(groups, BY_TOTAL);

    expect(groups).toEqual(original);
  });

  describe('ranking by the sorted column', () => {
    const withGovernance = (key: string, governance: number | null, total: number | null) =>
      makeGroup({
        key,
        name: key,
        subtotalFiat: total,
        rows: [
          makeRow({
            accountId: ALICE,
            id: `${key}-row`,
            fiat: { transferable: null, staked: null, governance, other: null, total },
          }),
        ],
      });

    // The rich account holds nothing in governance; the poor one does — the
    // point of the feature is that sorting Governance lifts the poor one.
    const rich = withGovernance('rich', null, 1000);
    const voter = withGovernance('voter', 5, 20);
    const column = [rich, voter];

    it('lifts accounts holding a balance in the sorted column', () => {
      expect(sortGroups(column, { key: 'governance', dir: 'desc' }).map((g) => g.key)).toEqual(['voter', 'rich']);
    });

    it('follows the sort direction', () => {
      expect(sortGroups(column, { key: 'governance', dir: 'asc' }).map((g) => g.key)).toEqual(['rich', 'voter']);
    });

    it('sums the column across the rows of a group', () => {
      const spread = makeGroup({
        key: 'spread',
        name: 'spread',
        subtotalFiat: 6,
        rows: [
          makeRow({
            accountId: ALICE,
            id: 'spread-a',
            fiat: { transferable: null, staked: null, governance: 3, other: null, total: 3 },
          }),
          makeRow({
            accountId: ALICE,
            id: 'spread-b',
            fiat: { transferable: null, staked: null, governance: 3, other: null, total: 3 },
          }),
        ],
      });

      expect(sortGroups([voter, spread], { key: 'governance', dir: 'desc' }).map((g) => g.key)).toEqual([
        'spread',
        'voter',
      ]);
    });

    it('keeps the fiat-subtotal order for the categorical chain column', () => {
      expect(sortGroups(column, { key: 'chain', dir: 'asc' }).map((g) => g.key)).toEqual(['rich', 'voter']);
    });
  });
});
