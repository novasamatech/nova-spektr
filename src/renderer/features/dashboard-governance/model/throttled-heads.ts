import { createStore, sample } from 'effector';

import { type ChainId } from '@/shared/core';
import { type BlockHeight } from '@/shared/polkadotjs-schemas';
import { block } from '@/domains/network';
import { BLOCK_SNAPSHOT_THROTTLE_MS } from '../hooks/constants';

/** One chain's held head, and the moment it was held. */
export type ThrottledHead = { block: BlockHeight; takenAtMs: number };

export type ThrottledHeads = Record<ChainId, ThrottledHead>;

/**
 * Whether the chain's next head is taken or dropped.
 *
 * The first head of a chain is always taken — a tab that waited five minutes
 * for its first number would just look broken — and every later one only once
 * the window has passed. Returns the **same object** when the head is dropped,
 * so the store does not update and nothing downstream re-renders.
 *
 * There is no timer behind the window. Heads arrive every ~6 s, so the first
 * one after the window expires lands by itself: the snapshot is late by at most
 * one block, and the whole delayed-re-emit machinery disappears.
 */
export function acceptHead(heads: ThrottledHeads, chainId: ChainId, head: BlockHeight, nowMs: number): ThrottledHeads {
  const current = heads[chainId];

  if (current && (current.block === head || nowMs - current.takenAtMs < BLOCK_SNAPSHOT_THROTTLE_MS)) {
    return heads;
  }

  return { ...heads, [chainId]: { block: head, takenAtMs: nowMs } };
}

/**
 * The head each chain's governance figures are derived from, held for
 * `BLOCK_SNAPSHOT_THROTTLE_MS` at a time.
 *
 * It is one store rather than per-hook state because several hooks on the tab
 * read the same chain's head and file what they derive from it under one
 * claim-schedule cache entry: throttling separately, they would settle on
 * different heights and evict each other on every pass.
 *
 * Entries outlive the widgets — leaving the tab and coming back inherits the
 * window rather than restarting it, which is the point: the numbers pick up
 * where they were instead of jumping on every remount.
 */
export const $throttledHeads = createStore<ThrottledHeads>({});

sample({
  clock: block.blockResource.push,
  source: $throttledHeads,
  fn: (heads, { params, result }) => acceptHead(heads, params.api.genesisHash.toHex(), result, Date.now()),
  target: $throttledHeads,
});
