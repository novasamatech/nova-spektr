import { describe, expect, it } from 'vitest';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type OperatorIdentity, buildOperatorClusters, isSameOperator } from '../clusters';

const account = (index: number) => `0x${index.toString(16).padStart(4, '0')}` as unknown as AccountId;

function identities(...names: string[]): Record<AccountId, OperatorIdentity> {
  const result: Record<AccountId, OperatorIdentity> = {};
  for (const [index, name] of names.entries()) {
    result[account(index)] = { name };
  }

  return result;
}

/** Distinct cluster keys, so a test can assert "these collapsed into one". */
function countClusters(parents: Record<AccountId, AccountId | null>): number {
  return new Set(Object.values(parents)).size;
}

describe('isSameOperator', () => {
  it('should match an operator that numbers its nodes', () => {
    // The case this was written for: 14 Binance validators, each with its own
    // root identity, previously read as 14 unrelated operators.
    expect(isSameOperator('BINANCE_STAKE_8', 'BINANCE_STAKE_13')).toBe(true);
    expect(isSameOperator('BINANCE_STAKE_1', 'BINANCE_STAKE_14')).toBe(true);
  });

  it('should ignore case and surrounding space', () => {
    expect(isSameOperator('BINANCE_STAKE_2', '  binance_stake_2  ')).toBe(true);
    expect(isSameOperator('BINANCE_STAKE_8', 'binance_stake_2')).toBe(true);
  });

  it('should match the naming styles operators actually use', () => {
    expect(isSameOperator('EXNESS.COM/3', 'EXNESS.COM/4')).toBe(true);
    expect(isSameOperator('BRC/01', 'BRC/05')).toBe(true);
    expect(isSameOperator('Meria/07', 'Meria/08')).toBe(true);
    expect(isSameOperator('stake-node-a', 'stake-node-b')).toBe(true);
  });

  it('should reject names that only share a tail', () => {
    // Three edits apart, and two different operators who both liked the word
    // "keeper". The difference sits in the stem, not in an index.
    expect(isSameOperator('DotKeeper', 'ZugKeeper')).toBe(false);
    expect(isSameOperator('alpha-node', 'omega-node')).toBe(false);
  });

  it('should not cluster short names three edits apart', () => {
    expect(isSameOperator('dot1', 'ksm1')).toBe(false);
    expect(isSameOperator('abcd', 'abxy')).toBe(false);
    expect(isSameOperator('LXLXLX', 'LXLYYY')).toBe(false);
  });

  it('should reject unrelated names outright', () => {
    expect(isSameOperator('P2P.ORG', 'RYABINA')).toBe(false);
    expect(isSameOperator('DotKeeper', 'LXLXLX')).toBe(false);
  });

  it('should still separate names beyond the distance however long they are', () => {
    expect(isSameOperator('validator-alpha-one', 'validator-omega-two')).toBe(false);
  });

  it('should treat a missing name as no evidence rather than a match', () => {
    expect(isSameOperator('', '')).toBe(false);
    expect(isSameOperator('', 'BINANCE_STAKE_1')).toBe(false);
    expect(isSameOperator('   ', 'BINANCE_STAKE_1')).toBe(false);
  });
});

describe('buildOperatorClusters', () => {
  it('should collapse a numbered family into one cluster', () => {
    const parents = buildOperatorClusters(
      identities('BINANCE_STAKE_1', 'BINANCE_STAKE_2', 'BINANCE_STAKE_13', 'binance_stake_14'),
    );

    expect(countClusters(parents)).toBe(1);
  });

  it('should still group sub-identities that share a parent name exactly', () => {
    const parents = buildOperatorClusters(identities('EXNESS.COM', 'EXNESS.COM', 'EXNESS.COM'));

    expect(countClusters(parents)).toBe(1);
    expect(Object.keys(parents)).toHaveLength(3);
  });

  it('should keep unrelated operators apart', () => {
    const parents = buildOperatorClusters(identities('DotKeeper', 'P2P.ORG', 'RYABINA', 'LXLXLX'));

    expect(countClusters(parents)).toBe(4);
  });

  it('should merge a family transitively', () => {
    // `node-aaa` and `node-ddd` are four edits apart, so only the chain through
    // the middle links them.
    const parents = buildOperatorClusters(identities('node-aaa', 'node-bbb', 'node-ccc', 'node-ddd'));

    expect(countClusters(parents)).toBe(1);
  });

  it('should elect the lowest account id of the cluster, whatever the input order', () => {
    const forward = buildOperatorClusters(identities('BINANCE_STAKE_1', 'BINANCE_STAKE_2'));
    const reversed = buildOperatorClusters(identities('BINANCE_STAKE_2', 'BINANCE_STAKE_1'));

    // Same two accounts either way, so the representative must not depend on the
    // order the chain happened to return them in.
    expect(new Set(Object.values(forward))).toEqual(new Set(Object.values(reversed)));
    expect(Object.values(forward)).toEqual([account(0), account(0)]);
  });

  it('should give a validator with no identity no cluster at all', () => {
    const parents = buildOperatorClusters(identities('BINANCE_STAKE_1', '', '   '));

    expect(Object.keys(parents)).toHaveLength(1);
    expect(parents[account(1)]).toBeUndefined();
    expect(parents[account(2)]).toBeUndefined();
  });

  it('should handle an empty identity map', () => {
    expect(buildOperatorClusters({})).toEqual({});
  });

  it('should stay fast on a full era of distinct identities', () => {
    const names = Array.from({ length: 600 }, (_, index) => `operator-${index}-${'x'.repeat(index % 7)}`);

    const started = performance.now();
    buildOperatorClusters(identities(...names));

    // Pairwise over distinct names, bounded by the length prefilter and the
    // early-exit distance - a regression here would show up as seconds.
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
