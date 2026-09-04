import { allSettled, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { type ChainId } from '@/shared/core';
import { kusamaChainId, polkadotChainId } from '@/shared/mocks';
import { type BlockHeight } from '@/shared/polkadotjs-schemas';
import { block } from '@/domains/network';

import { type ThrottledHeads, $throttledHeads, acceptHead } from './throttled-heads';

const WINDOW_MS = 300_000;
const START_MS = 1_700_000_000_000;

const height = (value: number) => value as BlockHeight;

const heads = (entries: Record<string, { block: number; takenAtMs: number }>): ThrottledHeads =>
  Object.fromEntries(
    Object.entries(entries).map(([chainId, entry]) => [chainId, { ...entry, block: height(entry.block) }]),
  );

/**
 * A subscription that hands the resource the heights it is told to, so the
 * store can be driven through the real wiring. `push` is readonly, so this is
 * the only way in from a test.
 */
const fakeApi = (chainId: ChainId, heights: number[]) => ({
  genesisHash: { toHex: () => chainId },
  rpc: {
    chain: {
      subscribeNewHeads: (callback: (header: { number: { toNumber: () => number } }) => void) => {
        for (const value of heights) callback({ number: { toNumber: () => value } });

        return Promise.resolve(() => {});
      },
    },
  },
});

describe('acceptHead', () => {
  it('takes the first head of a chain immediately', () => {
    const result = acceptHead({}, polkadotChainId, height(100), START_MS);

    expect(result).toEqual(heads({ [polkadotChainId]: { block: 100, takenAtMs: START_MS } }));
  });

  it('drops a head inside the window, keeping the state identical', () => {
    const current = heads({ [polkadotChainId]: { block: 100, takenAtMs: START_MS } });

    // Same object back — the store skips the update, so nothing re-renders.
    expect(acceptHead(current, polkadotChainId, height(101), START_MS + WINDOW_MS - 1)).toBe(current);
  });

  it('takes the first head after the window has passed', () => {
    const current = heads({ [polkadotChainId]: { block: 100, takenAtMs: START_MS } });
    const result = acceptHead(current, polkadotChainId, height(150), START_MS + WINDOW_MS);

    expect(result).toEqual(heads({ [polkadotChainId]: { block: 150, takenAtMs: START_MS + WINDOW_MS } }));
  });

  it('drops a repeat of the head it already holds, however late', () => {
    const current = heads({ [polkadotChainId]: { block: 100, takenAtMs: START_MS } });

    expect(acceptHead(current, polkadotChainId, height(100), START_MS + 10 * WINDOW_MS)).toBe(current);
  });

  it('windows each chain on its own', () => {
    const current = heads({ [polkadotChainId]: { block: 100, takenAtMs: START_MS } });
    const result = acceptHead(current, kusamaChainId, height(7), START_MS + 1);

    expect(result[polkadotChainId]).toEqual({ block: height(100), takenAtMs: START_MS });
    expect(result[kusamaChainId]).toEqual({ block: height(7), takenAtMs: START_MS + 1 });
  });
});

describe('$throttledHeads', () => {
  it('holds the first head a chain pushes and ignores the rest of the window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(START_MS);

    try {
      const scope = fork();

      await allSettled(block.blockResource.start, {
        scope,
        params: { api: fakeApi(polkadotChainId, [100, 101, 102]) as never },
      });

      expect(scope.getState($throttledHeads)[polkadotChainId]?.block).toBe(100);

      // …and the first push once the window has passed replaces it, with no
      // timer of its own: the next block does the work.
      vi.setSystemTime(START_MS + WINDOW_MS);
      await allSettled(block.blockResource.start, {
        scope,
        params: { api: fakeApi(kusamaChainId, [7]) as never },
      });

      expect(scope.getState($throttledHeads)[kusamaChainId]?.block).toBe(7);
      expect(scope.getState($throttledHeads)[polkadotChainId]?.block).toBe(100);
    } finally {
      vi.useRealTimers();
    }
  });
});
