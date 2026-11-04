import { describe, expect, it } from 'vitest';

import { getClaimBlockedReasonKey } from '../claim-chip';

describe('getClaimBlockedReasonKey', () => {
  it('keeps the chip live when the scan found a payout', () => {
    expect(getClaimBlockedReasonKey({ total: '100', pending: false, complete: true })).toBeNull();
  });

  it('keeps the chip live on an incomplete scan that still found a payout', () => {
    // Claiming what is known is a valid claim; the chip must not wait for
    // payouts it may never be able to see.
    expect(getClaimBlockedReasonKey({ total: '100', pending: false, complete: false })).toBeNull();
  });

  it('blocks the chip while the scan is still running', () => {
    expect(getClaimBlockedReasonKey({ total: '0', pending: true, complete: false })).toBe(
      'dashboard.staking.positions.detail.actions.scanningPayouts',
    );
  });

  it('says nothing to claim only after a complete scan found nothing', () => {
    expect(getClaimBlockedReasonKey({ total: '0', pending: false, complete: true })).toBe(
      'dashboard.staking.positions.detail.actions.nothingToClaim',
    );
  });

  it('blocks the chip when an incomplete scan found nothing, without asserting there is nothing', () => {
    // The request the chip would fire has no payouts to build from and is
    // dropped on the way - an enabled chip here is a dead click. The hint
    // explains the scan could not look everywhere instead of claiming "nothing".
    expect(getClaimBlockedReasonKey({ total: '0', pending: false, complete: false })).toBe(
      'dashboard.staking.positions.unclaimedUnknown',
    );
  });
});
