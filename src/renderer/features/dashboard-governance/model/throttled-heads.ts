import { createStore, sample } from 'effector';

import { type ChainId } from '@/shared/core';
import { type BlockHeight } from '@/shared/polkadotjs-schemas';
import { block } from '@/domains/network';

/**
 * How long a head is held before the next one is taken. Everything on the tab
 * derived from it — the unlock schedule, the referendum timelines — is measured
 * in days, so it has nothing to say between one block and the next; re-deriving
 * on every ~6 s block would re-render the whole tab for a change no one can
 * see.
 */
export const BLOCK_SNAPSHOT_THROTTLE_MS = 300_000;

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
 * one block, and the whole delayed-re-emit machinery disappears. Which is also
 * why a clock that jumps _backwards_ — an NTP correction, a resumed VM — has to
 * take the head rather than hold it: with no timer, a window that ends in the
 * past would freeze the chain's figures until the clock caught up again.
 */
export function acceptHead(heads: ThrottledHeads, chainId: ChainId, head: BlockHeight, nowMs: number): ThrottledHeads {
  const current = heads[chainId];

  if (current) {
    const heldForMs = nowMs - current.takenAtMs;
    const withinWindow = heldForMs >= 0 && heldForMs < BLOCK_SNAPSHOT_THROTTLE_MS;

    if (current.block === head || withinWindow) return heads;
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
  // The one impure step, deliberately kept to this line: reading the clock is
  // what decides the window, and everything that acts on it is in `acceptHead`.
  fn: (heads, { params, result }) => acceptHead(heads, params.api.genesisHash.toHex(), result, Date.now()),
  target: $throttledHeads,
});
