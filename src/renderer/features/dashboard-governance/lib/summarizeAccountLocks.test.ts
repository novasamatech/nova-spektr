import { BN } from '@polkadot/util';
import { describe, expect, it } from 'vitest';

import { type Chunks, type ClaimAction, UnlockChunkType } from '@/shared/api/governance';

import { summarizeAccountLocks } from './summarizeAccountLocks';

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

const pendingDelegation = (amount: number): Chunks => ({
  type: UnlockChunkType.PENDING_DELEGATION,
  amount: new BN(amount),
  claimableAt: { type: 'until' },
  affected: [],
});

describe('summarizeAccountLocks', () => {
  it('keeps claimable actions and sums amounts', () => {
    const summary = summarizeAccountLocks(
      [
        claimable(100, [{ type: 'unlock', trackId: '0' }]),
        claimable(50, [{ type: 'remove_vote', trackId: '1', referendumId: '10' }]),
      ],
      new BN(150),
    );

    expect(summary.claimable.toString()).toBe('150');
    expect(summary.claimableActions).toEqual([
      { type: 'unlock', trackId: '0' },
      { type: 'remove_vote', trackId: '1', referendumId: '10' },
    ]);
    expect(summary.tracks).toEqual(['0', '1']);
  });

  it('reports pending amount, the earliest unlock block and delegated separately', () => {
    const summary = summarizeAccountLocks(
      [pendingLock(30, 2_000, '5'), pendingLock(20, 1_000, '6'), pendingDelegation(70)],
      new BN(120),
    );

    expect(summary.pending.toString()).toBe('50');
    expect(summary.nextUnlockBlock).toBe(1_000);
    expect(summary.delegated.toString()).toBe('70');
    expect(summary.tracks).toEqual(['5', '6']);
    expect(summary.claimableActions).toEqual([]);
  });

  it('has a null next block when nothing is pending', () => {
    const summary = summarizeAccountLocks([claimable(1, [{ type: 'unlock', trackId: '0' }])], new BN(1));

    expect(summary.nextUnlockBlock).toBeNull();
    expect(summary.pending.isZero()).toBe(true);
  });
});
