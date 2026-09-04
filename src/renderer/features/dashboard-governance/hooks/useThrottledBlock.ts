import { type ApiPromise } from '@polkadot/api';
import { useStoreMap } from 'effector-react';

import { type ChainId } from '@/shared/core';
import { useBlock } from '@/domains/network';
import { $throttledHeads } from '../model/throttled-heads';

/**
 * The chain's head, live and as the snapshot every hook on the tab shares.
 *
 * `useBlock` stays here to keep the subscription alive for as long as something
 * renders; the throttling itself lives in `$throttledHeads`, which is fed by
 * the same subscription's pushes. `chainId` must be the chain `api` belongs to
 * — it is the key everything derived from the snapshot is filed under.
 */
export function useThrottledBlock(api: ApiPromise | null | undefined, chainId: ChainId) {
  const live = useBlock(api).data;
  const snapshot = useStoreMap({
    store: $throttledHeads,
    keys: [chainId],
    fn: (heads, [chainId]) => heads[chainId]?.block ?? null,
  });

  return { live, snapshot };
}
