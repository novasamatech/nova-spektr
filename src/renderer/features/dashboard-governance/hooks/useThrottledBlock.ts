import { type ApiPromise } from '@polkadot/api';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { type ChainId } from '@/shared/core';
import { type BlockHeight } from '@/shared/polkadotjs-schemas';
import { useBlock } from '@/domains/network';

import { BLOCK_SNAPSHOT_THROTTLE_MS } from './constants';

type ChainSnapshot = { block: BlockHeight | null; takenAtMs: number };

/**
 * One snapshot per chain, kept outside React on purpose.
 *
 * `useThrottledSnapshot` holds its snapshot in component state, so two hooks
 * throttling the same head settle on different heights and stay apart for up to
 * `BLOCK_SNAPSHOT_THROTTLE_MS`. The claim-schedule cache is keyed by chain and
 * account and shared by both, so divergent heights had each hook evict the
 * other's entry on every pass. A module-level store is the only place the two
 * can meet — a hook cannot share per-instance state with a sibling.
 */
const snapshots = new Map<ChainId, ChainSnapshot>();
const listeners = new Map<ChainId, Set<() => void>>();

/**
 * Stable reference for a chain nobody has published yet —
 * `useSyncExternalStore` compares snapshots by identity and loops on a fresh
 * object every read.
 */
const NO_SNAPSHOT: ChainSnapshot = { block: null, takenAtMs: 0 };

function readSnapshot(chainId: ChainId): ChainSnapshot {
  return snapshots.get(chainId) ?? NO_SNAPSHOT;
}

function publishSnapshot(chainId: ChainId, block: BlockHeight) {
  snapshots.set(chainId, { block, takenAtMs: Date.now() });
  for (const listener of listeners.get(chainId) ?? []) listener();
}

function subscribeToChain(chainId: ChainId, listener: () => void) {
  const chainListeners = listeners.get(chainId) ?? new Set<() => void>();
  listeners.set(chainId, chainListeners);
  chainListeners.add(listener);

  return () => {
    chainListeners.delete(listener);
    if (chainListeners.size === 0) listeners.delete(chainId);
  };
}

/**
 * The chain's head, live and as a snapshot every hook on the tab shares.
 *
 * The first height arrives immediately — a tab that waited five minutes for its
 * first number would just look broken — and every later one is held back to
 * `BLOCK_SNAPSHOT_THROTTLE_MS`. `chainId` must be the chain `api` belongs to:
 * it is the key everything derived from the snapshot is filed under.
 */
export function useThrottledBlock(api: ApiPromise | null | undefined, chainId: ChainId) {
  const live = useBlock(api).data;
  // Both have to be stable per chain: a new `subscribe` identity on every render
  // would tear the subscription down and set it up again each time.
  const subscribe = useCallback((listener: () => void) => subscribeToChain(chainId, listener), [chainId]);
  const getSnapshot = useCallback(() => readSnapshot(chainId), [chainId]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  // Synchronising an external store with a subscription is exactly what an
  // effect is for: the publish has to reach the other hooks reading this chain.
  useEffect(() => {
    if (live === null) return;

    const current = readSnapshot(chainId);
    if (current.block === live) return;

    const elapsedMs = Date.now() - current.takenAtMs;
    if (current.block === null || elapsedMs >= BLOCK_SNAPSHOT_THROTTLE_MS) {
      publishSnapshot(chainId, live);

      return;
    }

    const id = setTimeout(() => publishSnapshot(chainId, live), BLOCK_SNAPSHOT_THROTTLE_MS - elapsedMs);

    return () => clearTimeout(id);
  }, [live, chainId]);

  return { live, snapshot: snapshot.block };
}
