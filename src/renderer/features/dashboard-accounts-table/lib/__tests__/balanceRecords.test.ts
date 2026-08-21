import { type Balance } from '@/shared/core';
import { hasBalanceRecords } from '../balanceRecords';

const record = (accountId: string): Balance => ({ accountId }) as unknown as Balance;

/**
 * The signal that separates "not looked yet" from "looked, nothing there". The
 * widget commits to its empty state on it, so a false positive is a premature
 * empty table shown to a user who has plenty.
 */
describe('hasBalanceRecords', () => {
  test('reports nothing before any balance has landed', () => {
    expect(hasBalanceRecords({}, ['0x01'])).toEqual(false);
  });

  test('reports a record as soon as one exists for a selected account', () => {
    expect(hasBalanceRecords({ a: record('0x01') }, ['0x01'])).toEqual(true);
  });

  test('counts a zero balance as having been read', () => {
    // The whole point: a zero balance produces no row, so only the presence of
    // the record itself distinguishes an empty account from an unread one.
    expect(hasBalanceRecords({ a: record('0x01') }, ['0x01', '0x02'])).toEqual(true);
  });

  test('ignores records belonging to accounts outside the selection', () => {
    // Narrowing the dashboard filter to an account with no balances yet must
    // read as "not looked", not inherit the previous selection's evidence.
    expect(hasBalanceRecords({ a: record('0x02'), b: record('0x03') }, ['0x01'])).toEqual(false);
  });

  test('reports nothing for an empty selection', () => {
    expect(hasBalanceRecords({ a: record('0x01') }, [])).toEqual(false);
  });
});
