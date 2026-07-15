import { describe, expect, it } from 'vitest';

import { type ChainId } from '@/shared/core';
import { type BlockHeight } from '@/shared/polkadotjs-schemas';

import { mergeBlockHeights } from './blockHeights';

const RELAY = '0xrelay' as ChainId;
const OTHER = '0xother' as ChainId;

const heights = (entries: Record<string, number>) => entries as Record<ChainId, BlockHeight>;

describe('mergeBlockHeights', () => {
  it('prefers the live head over a poll that has fallen behind', () => {
    // The poll refreshes once a minute — ten blocks of a 6s chain — and a
    // backgrounded window throttles it further. That lag is the whole reason the
    // head is subscribed to.
    const merged = mergeBlockHeights(heights({ [RELAY]: 34_366_424 }), heights({ [RELAY]: 34_366_316 }));

    expect(merged[RELAY]).toBe(34_366_424);
  });

  it('falls back to the poll before any head has arrived', () => {
    const merged = mergeBlockHeights(heights({}), heights({ [RELAY]: 34_366_316 }));

    expect(merged[RELAY]).toBe(34_366_316);
  });

  it('never lets a head left over from an earlier visit drag a chain backwards', () => {
    // The resource keeps its cache after the last subscriber leaves, so on
    // re-open the cached head can be older than what the poll has since seen.
    const merged = mergeBlockHeights(heights({ [RELAY]: 34_360_000 }), heights({ [RELAY]: 34_366_424 }));

    expect(merged[RELAY]).toBe(34_366_424);
  });

  it('keeps chains only one source knows about', () => {
    const merged = mergeBlockHeights(heights({ [RELAY]: 10 }), heights({ [OTHER]: 20 }));

    expect(merged).toEqual({ [RELAY]: 10, [OTHER]: 20 });
  });
});
