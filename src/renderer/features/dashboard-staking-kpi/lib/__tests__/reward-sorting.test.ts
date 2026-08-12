import { describe, expect, it } from 'vitest';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { DEFAULT_REWARD_SORT, isRewardSortColumn, sortRewardRows } from '../reward-sorting';
import { type ValidatorRewardRow } from '../validator-rewards';

const POLKADOT = '0xpolkadot' as ChainId;
const KUSAMA = '0xkusama' as ChainId;

const account = (index: number) => `0xacc${index}` as AccountId;

type SortableRow = ValidatorRewardRow & { accruedFiat: string };

function row(key: string, params: Partial<SortableRow> = {}): SortableRow {
  return {
    key,
    chainId: POLKADOT,
    chainName: 'Polkadot',
    validatorId: account(1),
    symbol: 'DOT',
    precision: 10,
    nominators: [account(1)],
    isSelf: false,
    accrued: '0',
    unclaimed: '0',
    unclaimedFiat: '0',
    accruedFiat: '0',
    eras: [],
    payouts: [],
    ...params,
  };
}

const keys = (rows: SortableRow[]) => rows.map((r) => r.key);

describe('sortRewardRows unclaimed', () => {
  it('puts the biggest unclaimed fiat first on desc — the default order', () => {
    const rows = [
      row('small', { unclaimedFiat: '5' }),
      row('big', { unclaimedFiat: '20' }),
      row('mid', { unclaimedFiat: '10' }),
    ];

    expect(keys(sortRewardRows(rows, 'unclaimed', 'desc', {}))).toEqual(['big', 'mid', 'small']);
  });

  it('flips to smallest first on asc', () => {
    const rows = [
      row('small', { unclaimedFiat: '5' }),
      row('big', { unclaimedFiat: '20' }),
      row('mid', { unclaimedFiat: '10' }),
    ];

    expect(keys(sortRewardRows(rows, 'unclaimed', 'asc', {}))).toEqual(['small', 'mid', 'big']);
  });

  it('breaks ties by accrued fiat, biggest first in both directions', () => {
    const rows = [
      row('lean', { unclaimedFiat: '10', accruedFiat: '1' }),
      row('rich', { unclaimedFiat: '10', accruedFiat: '9' }),
    ];

    expect(keys(sortRewardRows(rows, 'unclaimed', 'desc', {}))).toEqual(['rich', 'lean']);
    expect(keys(sortRewardRows(rows, 'unclaimed', 'asc', {}))).toEqual(['rich', 'lean']);
  });
});

describe('sortRewardRows accrued', () => {
  it('sorts by fiat across chains — planck amounts are not comparable', () => {
    // The KSM row's planck dwarfs the DOT one; its fiat does not.
    const rows = [
      row('ksm', { chainId: KUSAMA, accrued: '999999999999', accruedFiat: '2' }),
      row('dot', { chainId: POLKADOT, accrued: '1', accruedFiat: '50' }),
    ];

    expect(keys(sortRewardRows(rows, 'accrued', 'desc', {}))).toEqual(['dot', 'ksm']);
    expect(keys(sortRewardRows(rows, 'accrued', 'asc', {}))).toEqual(['ksm', 'dot']);
  });

  it('breaks ties by unclaimed fiat, biggest first in both directions', () => {
    const rows = [
      row('settled', { accruedFiat: '10', unclaimedFiat: '0' }),
      row('owed', { accruedFiat: '10', unclaimedFiat: '7' }),
    ];

    expect(keys(sortRewardRows(rows, 'accrued', 'desc', {}))).toEqual(['owed', 'settled']);
    expect(keys(sortRewardRows(rows, 'accrued', 'asc', {}))).toEqual(['owed', 'settled']);
  });
});

describe('sortRewardRows nominators', () => {
  it('sorts by how many of our accounts stand behind the validator', () => {
    const rows = [
      row('three', { nominators: [account(1), account(2), account(3)] }),
      row('one', { nominators: [account(1)] }),
      row('two', { nominators: [account(1), account(2)] }),
    ];

    expect(keys(sortRewardRows(rows, 'nominators', 'asc', {}))).toEqual(['one', 'two', 'three']);
    expect(keys(sortRewardRows(rows, 'nominators', 'desc', {}))).toEqual(['three', 'two', 'one']);
  });

  it('puts our own validator first on a count tie', () => {
    const rows = [
      row('theirs', { nominators: [account(1), account(2)] }),
      row('ours', { nominators: [account(1), account(2)], isSelf: true }),
    ];

    expect(keys(sortRewardRows(rows, 'nominators', 'asc', {}))).toEqual(['ours', 'theirs']);
    expect(keys(sortRewardRows(rows, 'nominators', 'desc', {}))).toEqual(['ours', 'theirs']);
  });
});

describe('sortRewardRows validatorId', () => {
  it('sorts by the displayed name from the caller-supplied map, keyed by row key', () => {
    const rows = [row('z'), row('a'), row('m')];
    const names = { z: 'Zug', a: 'Amsterdam', m: 'Milan' };

    expect(keys(sortRewardRows(rows, 'validatorId', 'asc', names))).toEqual(['a', 'm', 'z']);
    expect(keys(sortRewardRows(rows, 'validatorId', 'desc', names))).toEqual(['z', 'm', 'a']);
  });

  it('compares names case-insensitively', () => {
    // A code-unit compare would put 'Banana' before 'apple'.
    const rows = [row('b'), row('a')];
    const names = { b: 'Banana', a: 'apple' };

    expect(keys(sortRewardRows(rows, 'validatorId', 'asc', names))).toEqual(['a', 'b']);
  });

  it('groups rows missing from the map first on asc — they compare as empty', () => {
    const rows = [row('named', {}), row('unnamed', {})];
    const names = { named: 'Alice' };

    expect(keys(sortRewardRows(rows, 'validatorId', 'asc', names))).toEqual(['unnamed', 'named']);
    expect(keys(sortRewardRows(rows, 'validatorId', 'desc', names))).toEqual(['named', 'unnamed']);
  });
});

describe('sortRewardRows input', () => {
  it('returns a new array and leaves the input order alone', () => {
    const rows = [row('small', { unclaimedFiat: '5' }), row('big', { unclaimedFiat: '20' })];

    const sorted = sortRewardRows(rows, 'unclaimed', 'desc', {});

    expect(sorted).not.toBe(rows);
    expect(keys(rows)).toEqual(['small', 'big']);
  });
});

describe('isRewardSortColumn', () => {
  it('accepts exactly the four sortable columns', () => {
    expect(isRewardSortColumn('validatorId')).toBe(true);
    expect(isRewardSortColumn('nominators')).toBe(true);
    expect(isRewardSortColumn('accrued')).toBe(true);
    expect(isRewardSortColumn('unclaimed')).toBe(true);
    expect(isRewardSortColumn('payouts')).toBe(false);
    expect(isRewardSortColumn('')).toBe(false);
  });
});

describe('DEFAULT_REWARD_SORT', () => {
  it('leads with unclaimed desc — the order the rows are built in', () => {
    expect(DEFAULT_REWARD_SORT).toEqual({ column: 'unclaimed', direction: 'desc' });
    expect(isRewardSortColumn(DEFAULT_REWARD_SORT.column)).toBe(true);
  });
});
