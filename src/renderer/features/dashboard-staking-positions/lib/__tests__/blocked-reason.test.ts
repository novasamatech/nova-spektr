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

  it('borrows the drafts feature’s own wording for the permission it names', () => {
    // Not a second copy of the string: a rename over there would otherwise
    // leave this tooltip rendering a raw i18n path.
    expect(getBlockedReasonKey(blocked('draftsNoPermission'))).toBe('operations.drafts.noWritePermission');
  });
});

describe('isViewOnly', () => {
  /**
   * The grid caption is the one place the four reasons collapse into one word,
   * and "view only" is the most terminal word available. It is therefore spent
   * only on the reasons that really are terminal — a missing address book and a
   * missing permission are one click, or one admin, away from acting, and
   * labelling those "view only" would call a live row dead.
   */
  it('is true only for reasons no action of the user’s can lift', () => {
    expect(isViewOnly(blocked('watchOnly'))).toBe(true);
    expect(isViewOnly(blocked('noDraftRoute'))).toBe(true);

    expect(isViewOnly(blocked('draftsNotConnected'))).toBe(false);
    expect(isViewOnly(blocked('draftsNoPermission'))).toBe(false);
  });

  it('is false for anything that can act', () => {
    expect(isViewOnly({ mode: 'direct' })).toBe(false);
    expect(isViewOnly({ mode: 'draft' })).toBe(false);
  });
});
