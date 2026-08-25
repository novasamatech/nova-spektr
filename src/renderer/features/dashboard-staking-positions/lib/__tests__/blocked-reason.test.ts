import { describe, expect, it } from 'vitest';

import { getBlockedReasonKey, isViewOnly } from '../blocked-reason';
import { type PositionAccess } from '../types';

const blocked = (
  reason: 'watchOnly' | 'noDraftRoute' | 'draftsNotConnected' | 'draftsNoPermission',
): PositionAccess => ({ mode: 'blocked', reason });

describe('getBlockedReasonKey', () => {
  it('says nothing about a position that can act', () => {
    expect(getBlockedReasonKey({ mode: 'direct' })).toBeNull();
    expect(getBlockedReasonKey({ mode: 'multisig' })).toBeNull();
    expect(getBlockedReasonKey({ mode: 'draft' })).toBeNull();
  });

  it('gives each reason its own sentence', () => {
    const keys = (['watchOnly', 'noDraftRoute', 'draftsNotConnected', 'draftsNoPermission'] as const).map((reason) =>
      getBlockedReasonKey(blocked(reason)),
    );

    // Four reasons, four different things to tell the user. A single
    // "unavailable" would flatten a fixable state into a dead one.
    expect(new Set(keys).size).toBe(4);
    expect(keys).not.toContain(null);
  });

  it('tells a user without the draft permission how to act on the account instead', () => {
    // Not the drafts list's "ask your admin": from a position row the useful
    // next move is to add the account's key to a wallet.
    expect(getBlockedReasonKey(blocked('draftsNoPermission'))).toBe(
      'dashboard.staking.positions.detail.blocked.draftsNoPermission',
    );
  });
});

describe('isViewOnly', () => {
  /**
   * The grid caption is the one place the four reasons collapse into one word,
   * and "view only" is the most terminal word available. It is therefore spent
   * only on the reasons the user cannot lift from this app — a missing draft
   * permission is granted elsewhere, so the row reads like a watch-only one —
   * and withheld from the missing connection, which is one click away.
   */
  it('is true only for reasons no action of the user’s can lift', () => {
    expect(isViewOnly(blocked('watchOnly'))).toBe(true);
    expect(isViewOnly(blocked('noDraftRoute'))).toBe(true);
    expect(isViewOnly(blocked('draftsNoPermission'))).toBe(true);

    expect(isViewOnly(blocked('draftsNotConnected'))).toBe(false);
  });

  it('is false for anything that can act', () => {
    expect(isViewOnly({ mode: 'direct' })).toBe(false);
    expect(isViewOnly({ mode: 'draft' })).toBe(false);
  });
});
