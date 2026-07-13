import { describe, expect, it } from 'vitest';

import { isFullyResolved, isLoadingMore, resolveStatus } from './status';

describe('isFullyResolved', () => {
  it('is false while any chain has yet to report', () => {
    expect(isFullyResolved({ enabledCount: 10, unresolved: 1, loadingWallets: false })).toBe(false);
  });

  it('is false while the wallets are still loading', () => {
    // No accounts yet means no chain has anything to look up, so every chain
    // "resolves" instantly — the empty state that would follow is a lie told
    // before the question was asked.
    expect(isFullyResolved({ enabledCount: 10, unresolved: 0, loadingWallets: true })).toBe(false);
  });

  it('is false before the network config has loaded', () => {
    expect(isFullyResolved({ enabledCount: 0, unresolved: 0, loadingWallets: false })).toBe(false);
  });

  it('is true once every enabled chain has reported', () => {
    expect(isFullyResolved({ enabledCount: 10, unresolved: 0, loadingWallets: false })).toBe(true);
  });
});

describe('resolveStatus', () => {
  it('holds the skeleton while chains are still reporting', () => {
    expect(resolveStatus({ hasSchedules: false, fullyResolved: false, settledOnce: false })).toBe('loading');
  });

  it('shows content the moment a schedule lands, without waiting for the rest', () => {
    expect(resolveStatus({ hasSchedules: true, fullyResolved: false, settledOnce: false })).toBe('ready');
  });

  it('reports empty only once everything has reported', () => {
    expect(resolveStatus({ hasSchedules: false, fullyResolved: true, settledOnce: false })).toBe('empty');
  });

  it('keeps the settled answer when a chain goes unresolved again', () => {
    // The latch. A chain reconnecting hours later must not throw the block back
    // to a skeleton; `isLoadingMore` carries that news instead.
    const status = resolveStatus({ hasSchedules: false, fullyResolved: false, settledOnce: true });

    expect(status).toBe('empty');
    expect(isLoadingMore({ status, fullyResolved: false })).toBe(true);
  });
});

describe('isLoadingMore', () => {
  it('is silent while the skeleton is up — the skeleton already says "loading"', () => {
    expect(isLoadingMore({ status: 'loading', fullyResolved: false })).toBe(false);
  });

  it('flags content that may still grow', () => {
    expect(isLoadingMore({ status: 'ready', fullyResolved: false })).toBe(true);
  });

  it('is silent once everything has reported', () => {
    expect(isLoadingMore({ status: 'ready', fullyResolved: true })).toBe(false);
  });
});
