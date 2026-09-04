import { type ApiPromise } from '@polkadot/api';
import { allSettled, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { type ChainId } from '@/shared/core';
import { kusamaAssetHubChainId, kusamaChainId, polkadotChainId } from '@/shared/mocks';
import { type BlockHeight } from '@/shared/polkadotjs-schemas';
import { block } from '@/domains/network';

import { type ThrottledHeads, $throttledHeads, BLOCK_SNAPSHOT_THROTTLE_MS, acceptHead } from './throttled-heads';

const WINDOW_MS = BLOCK_SNAPSHOT_THROTTLE_MS;
const START_MS = 1_700_000_000_000;

const height = (value: number) => value as BlockHeight;

const heads = (entries: Record<string, { block: number; takenAtMs: number }>): ThrottledHeads =>
  Object.fromEntries(
    Object.entries(entries).map(([chainId, entry]) => [chainId, { ...entry, block: height(entry.block) }]),
  );

/**
 * A subscription that hands the resource the heights it is told to, each at its
 * own moment on the fake clock, so the store can be driven through the real
 * wiring. `blockResource.push` is readonly and cannot be targeted from a test —
 * starting the subscription is the only way in.
 */
const fakeApi = (chainId: ChainId, deliveries: { atMs: number; height: number }[]) =>
  ({
    genesisHash: { toHex: () => chainId },
    rpc: {
      chain: {
        subscribeNewHeads: (callback: (header: { number: { toNumber: () => number } }) => void) => {
          for (const { atMs, height } of deliveries) {
            vi.setSystemTime(atMs);
            callback({ number: { toNumber: () => height } });
          }

          return Promise.resolve(() => {});
        },
      },
    },
  }) as unknown as ApiPromise;

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

  it('takes the head when the clock jumps backwards', () => {
    // An NTP correction or a resumed VM puts `now` before the window started.
    // Nothing but the next head would ever release it, so the next head wins.
    const current = heads({ [polkadotChainId]: { block: 100, takenAtMs: START_MS } });
    const result = acceptHead(current, polkadotChainId, height(101), START_MS - 60_000);

    expect(result[polkadotChainId]).toEqual({ block: height(101), takenAtMs: START_MS - 60_000 });
  });

  it('windows each chain on its own', () => {
    const current = heads({ [polkadotChainId]: { block: 100, takenAtMs: START_MS } });
    const result = acceptHead(current, kusamaChainId, height(7), START_MS + 1);

    expect(result[polkadotChainId]).toEqual({ block: height(100), takenAtMs: START_MS });
    expect(result[kusamaChainId]).toEqual({ block: height(7), takenAtMs: START_MS + 1 });
  });
});

describe('$throttledHeads', () => {
  it('drops the heads inside the window and takes the first one after it', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(START_MS);

    try {
      const scope = fork();

      await allSettled(block.blockResource.start, {
        scope,
        params: {
          api: fakeApi(polkadotChainId, [
            { atMs: START_MS, height: 100 },
            // Same window: dropped, or the store would follow every block.
            { atMs: START_MS + WINDOW_MS - 1, height: 101 },
            // Window over: taken, with no timer having been involved.
            { atMs: START_MS + WINDOW_MS, height: 102 },
            // …which opens a window of its own, so this one is dropped too.
            { atMs: START_MS + WINDOW_MS + 1, height: 103 },
          ]),
        },
      });

      // Both halves are pinned by this one value: 101 was dropped (or the head
      // would read 101, its own window swallowing 102), and 102 was taken (or
      // the head would still read 100).
      expect(scope.getState($throttledHeads)[polkadotChainId]).toEqual({
        block: 102,
        takenAtMs: START_MS + WINDOW_MS,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  // The resource's subscription pool is module-level, so a chain already
  // subscribed in another test would not be subscribed again — each test drives
  // chains of its own.
  it('windows the two chains independently', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(START_MS);

    try {
      const scope = fork();

      await allSettled(block.blockResource.start, {
        scope,
        params: { api: fakeApi(kusamaChainId, [{ atMs: START_MS, height: 100 }]) },
      });
      await allSettled(block.blockResource.start, {
        scope,
        params: { api: fakeApi(kusamaAssetHubChainId, [{ atMs: START_MS + 1, height: 7 }]) },
      });

      expect(scope.getState($throttledHeads)[kusamaChainId]?.block).toBe(100);
      expect(scope.getState($throttledHeads)[kusamaAssetHubChainId]?.block).toBe(7);
    } finally {
      vi.useRealTimers();
    }
  });
});
