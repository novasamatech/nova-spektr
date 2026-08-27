import { BN } from '@polkadot/util';
import { describe, expect, it } from 'vitest';

import { type Chunks, type ClaimAction, UnlockChunkType } from '@/shared/api/governance';

import { collectClaimable } from './collectClaimable';

const claimable = (amount: number, actions: ClaimAction[]): Chunks => ({
  type: UnlockChunkType.CLAIMABLE,
  amount: new BN(amount),
  actions,
});

const pendingLock = (amount: number, block: number, trackId: string): Chunks => ({
  type: UnlockChunkType.PENDING_LOCK,
  amount: new BN(amount),
  claimableAt: { type: 'at', block },
  affected: [{ type: 'track', trackId }],
});

describe('collectClaimable', () => {
  it('sums claimable chunks and concatenates their actions', () => {
    const result = collectClaimable([
      claimable(100, [{ type: 'unlock', trackId: '0' }]),
      pendingLock(70, 1000, '2'),
      claimable(0, [{ type: 'unlock', trackId: '9' }]),
      claimable(50, [{ type: 'remove_vote', trackId: '1', referendumId: '10' }]),
    ]);

    expect(result.amount.toString()).toBe('150');
    expect(result.actions).toEqual([
      { type: 'unlock', trackId: '0' },
      { type: 'remove_vote', trackId: '1', referendumId: '10' },
    ]);
  });

  it('returns no actions and zero when nothing is claimable', () => {
    const result = collectClaimable([pendingLock(70, 1000, '2'), claimable(0, [{ type: 'unlock', trackId: '0' }])]);

    expect(result.amount.isZero()).toBe(true);
    expect(result.actions).toEqual([]);
  });
});
