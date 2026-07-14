import { type ChainId } from '@/shared/core';
import { entries } from '@/shared/lib/utils';
import { type BlockHeight } from '@/shared/polkadotjs-schemas';

/**
 * The best height known for each chain, from the live head subscription and the
 * background poll together.
 *
 * Both are legitimate sources and either can be the fresher one: the poll has a
 * value from app start, before any head has been subscribed to, while a head
 * left in the resource's cache from an earlier visit can be minutes old by the
 * time the block is opened again. Heights only ever move forward, so the larger
 * of the two is always the more recent — no source needs to be trusted over the
 * other, and neither can drag the figures backwards.
 */
export const mergeBlockHeights = (
  heads: Record<ChainId, BlockHeight>,
  polled: Record<ChainId, BlockHeight>,
): Record<ChainId, BlockHeight> => {
  const merged: Record<ChainId, BlockHeight> = { ...polled };

  for (const [chainId, height] of entries(heads)) {
    const known = merged[chainId];
    if (known == null || height > known) {
      merged[chainId] = height;
    }
  }

  return merged;
};
