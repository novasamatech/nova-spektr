import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AccessMode } from '../access';
import {
  claimableKeys,
  computeSelectionTotals,
  getSelectAllState,
  isClaimable,
  toggleRow,
  toggleSelectAll,
} from '../selection';
import { type ClaimRow } from '../types';

type RowOverrides = {
  key: string;
  symbol?: string;
  precision?: number;
  unclaimed?: string;
  unclaimedFiat?: string;
  accessMode?: AccessMode;
};

function makeRow({
  key,
  symbol = 'DOT',
  precision = 10,
  unclaimed = '100',
  unclaimedFiat = '10',
  accessMode = 'direct',
}: RowOverrides): ClaimRow {
  return {
    key,
    accountId: `0x${key}` as AccountId,
    chainId: '0xchain' as ChainId,
    chainName: 'Polkadot Asset Hub',
    symbol,
    precision,
    earned: '500',
    unclaimed,
    unclaimedFiat,
    eras: [1500],
    payouts: [{ era: 1500, validator: '0xval' as AccountId, page: 0, amount: unclaimed }],
    accessMode,
  };
}

describe('claimability', () => {
  test('a direct account with something unclaimed can be claimed', () => {
    expect(isClaimable(makeRow({ key: 'a' }))).toBe(true);
  });

  test('a watch-only account cannot, however much it has earned', () => {
    expect(isClaimable(makeRow({ key: 'a', accessMode: 'watchOnly' }))).toBe(false);
  });

  test('nothing unclaimed means nothing to claim', () => {
    expect(isClaimable(makeRow({ key: 'a', unclaimed: '0' }))).toBe(false);
  });

  test('multisig and draft accounts stay claimable — the flow differs, not the right', () => {
    expect(isClaimable(makeRow({ key: 'a', accessMode: 'multisig' }))).toBe(true);
    expect(isClaimable(makeRow({ key: 'a', accessMode: 'draft' }))).toBe(true);
  });
});

describe('select all', () => {
  const rows = [
    makeRow({ key: 'a' }),
    makeRow({ key: 'b' }),
    makeRow({ key: 'c', accessMode: 'watchOnly' }),
    makeRow({ key: 'd', unclaimed: '0' }),
  ];

  test('only claimable rows participate', () => {
    expect(claimableKeys(rows)).toEqual(['a', 'b']);
  });

  test('state reflects the claimable subset, not every row', () => {
    expect(getSelectAllState(rows, new Set())).toBe('none');
    expect(getSelectAllState(rows, new Set(['a']))).toBe('some');
    expect(getSelectAllState(rows, new Set(['a', 'b']))).toBe('all');
  });

  test('toggling from all clears, anything else selects everything claimable', () => {
    expect(toggleSelectAll(rows, new Set(['a', 'b']))).toEqual([]);
    expect(toggleSelectAll(rows, new Set(['a']))).toEqual(['a', 'b']);
    expect(toggleSelectAll(rows, new Set())).toEqual(['a', 'b']);
  });

  test('a table with nothing claimable reports none', () => {
    expect(getSelectAllState([makeRow({ key: 'x', accessMode: 'watchOnly' })], new Set())).toBe('none');
  });
});

describe('row toggle', () => {
  test('adds and removes', () => {
    expect(toggleRow(new Set(['a']), 'b').sort()).toEqual(['a', 'b']);
    expect(toggleRow(new Set(['a', 'b']), 'b')).toEqual(['a']);
  });
});

describe('selection totals', () => {
  test('groups by asset instead of summing across them', () => {
    const rows = [
      makeRow({ key: 'a', symbol: 'DOT', unclaimed: '100', unclaimedFiat: '10' }),
      makeRow({ key: 'b', symbol: 'DOT', unclaimed: '250', unclaimedFiat: '25' }),
      makeRow({ key: 'c', symbol: 'KSM', precision: 12, unclaimed: '40', unclaimedFiat: '4' }),
    ];

    const totals = computeSelectionTotals(rows, new Set(['a', 'b', 'c']));

    expect(totals.count).toBe(3);
    expect(totals.amounts).toEqual([
      { symbol: 'DOT', precision: 10, amount: '350' },
      { symbol: 'KSM', precision: 12, amount: '40' },
    ]);
    expect(totals.fiat).toBe('39');
  });

  test('an empty selection totals nothing', () => {
    const totals = computeSelectionTotals([makeRow({ key: 'a' })], new Set());

    expect(totals).toEqual({ count: 0, amounts: [], fiat: '0', requests: [] });
  });

  test('a non-claimable key in the selection is ignored', () => {
    const rows = [makeRow({ key: 'a' }), makeRow({ key: 'b', accessMode: 'watchOnly' })];
    const totals = computeSelectionTotals(rows, new Set(['a', 'b']));

    expect(totals.count).toBe(1);
    expect(totals.amounts).toEqual([{ symbol: 'DOT', precision: 10, amount: '100' }]);
  });

  test('carries the payouts the claim flow needs, verbatim', () => {
    const totals = computeSelectionTotals([makeRow({ key: 'a' })], new Set(['a']));

    expect(totals.requests).toEqual([
      {
        accountId: '0xa',
        chainId: '0xchain',
        payouts: [{ era: 1500, validator: '0xval', page: 0, amount: '100' }],
      },
    ]);
  });
});
