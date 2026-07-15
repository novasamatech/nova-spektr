import { type ChainId } from '@/shared/core';
import { entries, getTimelineChainId } from '@/shared/lib/utils';
import { type BlockHeight } from '@/shared/polkadotjs-schemas';
import { type VestingChainRequest } from '@/domains/vesting';

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

/**
 * The heights the figures are actually read against — one per timeline chain of
 * the current requests.
 *
 * The merged map above carries a height for _every_ connected chain: the
 * background poll refreshes all of them once a minute, and each refresh would
 * otherwise re-run the whole vesting computation for chains that have nothing
 * to do with vesting. Narrowing it to the timeline chains (paired with
 * `sameHeights` as an `updateFilter`) confines the recomputation to the heights
 * that can actually change a figure.
 */
export const pickTimelineHeights = ({
  heights,
  requests,
}: {
  heights: Record<ChainId, BlockHeight>;
  requests: VestingChainRequest[];
}): Record<ChainId, BlockHeight> => {
  const timeline: Record<ChainId, BlockHeight> = {};

  for (const { chain } of requests) {
    const timelineChainId = getTimelineChainId(chain);
    const height = heights[timelineChainId];
    if (height != null) {
      timeline[timelineChainId] = height;
    }
  }

  return timeline;
};

/**
 * The same chains at the same heights — nothing downstream would print
 * differently.
 */
export const sameHeights = (next: Record<ChainId, BlockHeight>, prev: Record<ChainId, BlockHeight>): boolean => {
  const nextEntries = entries(next);

  return (
    nextEntries.length === Object.keys(prev).length &&
    nextEntries.every(([chainId, height]) => prev[chainId] === height)
  );
};
