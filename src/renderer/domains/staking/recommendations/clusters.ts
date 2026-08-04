import { entries, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { MAX_OPERATOR_NAME_DISTANCE } from './constants';
import { type IdentityParentMap } from './types';

/** The only thing cluster grouping needs from an identity. */
export type OperatorIdentity = {
  /** Root display name - the parent's name for a sub-identity. */
  name: string;
};

/**
 * Groups validators into operator clusters.
 *
 * Two signals, because operators announce themselves in two different ways:
 *
 * 1. **A shared root display name.** Every sub-identity carries its parent's name,
 *    so `EXNESS.COM/0..5` all read `exness.com` and group exactly.
 * 2. **Near-identical direct identities.** Plenty of operators skip sub-identities
 *    and register a separate root identity per node - `BINANCE_STAKE_1 …
 *    BINANCE_STAKE_14`. Those names are all distinct, so exact grouping saw
 *    fourteen unrelated operators where there is one.
 *
 * Grouping is transitive: names are merged through a union-find, so `node-a →
 * node-b → node-c` ends up as one cluster even when the first and the last are
 * further apart than the threshold. That is what makes a numbered family
 * collapse whatever order it arrives in, and it is also the way this can
 * over-merge - a long enough chain of pairwise-similar names walks between two
 * genuinely different operators. `isSameOperator` keeps the steps short enough
 * that it does not happen with real identities.
 *
 * Validators with no identity get no entry and are therefore never clustered:
 * having nothing to compare is not evidence of a shared operator.
 */
export function buildOperatorClusters(identities: Record<AccountId, OperatorIdentity>): IdentityParentMap {
  const accountsByName = groupByName(identities);
  const names = Array.from(accountsByName.keys());

  const roots = mergeSimilarNames(names);

  // Account ids per merged cluster, keyed by the union-find root.
  const accountsByCluster = new Map<number, AccountId[]>();
  for (const [index, name] of names.entries()) {
    const accounts = accountsByName.get(name);
    if (nullable(accounts)) continue;

    const root = findRoot(roots, index);
    const cluster = accountsByCluster.get(root);

    if (cluster) {
      cluster.push(...accounts);
    } else {
      accountsByCluster.set(root, [...accounts]);
    }
  }

  // `IdentityParentMap` values are account ids, so each cluster elects its
  // lowest account id as a stable representative - stable across reloads, unlike
  // whichever member the chain happened to return first.
  const parents: IdentityParentMap = {};
  for (const cluster of accountsByCluster.values()) {
    const [representative] = cluster.toSorted();
    if (nullable(representative)) continue;

    for (const accountId of cluster) {
      parents[accountId] = representative;
    }
  }

  return parents;
}

/**
 * Whether two identity names look like nodes of one operator.
 *
 * Two conditions, and the second one is the load-bearing half.
 *
 * **The names differ by at most `MAX_OPERATOR_NAME_DISTANCE` edits.** That
 * covers how an operator's nodes really vary: an index that grew a digit (`_9`
 * → `_14`), a swapped separator, a change of case.
 *
 * **Most of the shorter name is a shared prefix.** Distance alone is not a test
 * of anything - `dotkeeper` and `zugkeeper` are three edits apart and are two
 * different operators who both liked the word "keeper", and `dot1` is three
 * edits from `ksm1`. What distinguishes a numbered family is _where_ the
 * difference sits: the stem is shared and the tail varies. Requiring the common
 * prefix to cover more than half the shorter name says exactly that, and it is
 * what rejects names that merely happen to be close.
 */
export function isSameOperator(first: string, second: string): boolean {
  const a = normalizeName(first);
  const b = normalizeName(second);

  if (a.length === 0 || b.length === 0) return false;
  if (a === b) return true;

  const shortest = Math.min(a.length, b.length);
  if (getCommonPrefixLength(a, b) * 2 <= shortest) return false;

  return getBoundedDistance(a, b, MAX_OPERATOR_NAME_DISTANCE) <= MAX_OPERATOR_NAME_DISTANCE;
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function getCommonPrefixLength(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);

  let length = 0;
  while (length < limit && a[length] === b[length]) {
    length++;
  }

  return length;
}

function groupByName(identities: Record<AccountId, OperatorIdentity>): Map<string, AccountId[]> {
  const groups = new Map<string, AccountId[]>();

  for (const [accountId, identity] of entries(identities)) {
    const name = normalizeName(identity.name);
    if (name.length === 0) continue;

    const group = groups.get(name);
    if (group) {
      group.push(accountId);
    } else {
      groups.set(name, [accountId]);
    }
  }

  return groups;
}

/**
 * Union-find over the distinct names, returning the parent array.
 *
 * Comparison runs over distinct _names_ rather than validators: an era has ~600
 * validators but far fewer identities, and a numbered family collapses to one
 * name per node at most.
 */
function mergeSimilarNames(names: string[]): Int32Array {
  const roots = new Int32Array(names.length);
  for (let index = 0; index < names.length; index++) {
    roots[index] = index;
  }

  for (let i = 0; i < names.length; i++) {
    const left = names[i];
    if (nullable(left)) continue;

    for (let j = i + 1; j < names.length; j++) {
      const right = names[j];
      if (nullable(right)) continue;

      // Already the same cluster - the pair cannot add anything.
      if (findRoot(roots, i) === findRoot(roots, j)) continue;
      if (isSameOperator(left, right)) union(roots, i, j);
    }
  }

  return roots;
}

function findRoot(roots: Int32Array, index: number): number {
  let current = index;

  while (roots[current] !== current) {
    // Path halving: keeps repeated lookups near-flat without a second pass.
    roots[current] = roots[roots[current] ?? current] ?? current;
    current = roots[current] ?? current;
  }

  return current;
}

function union(roots: Int32Array, first: number, second: number): void {
  const a = findRoot(roots, first);
  const b = findRoot(roots, second);
  if (a === b) return;

  // Lowest index wins, so the result does not depend on the merge order.
  roots[Math.max(a, b)] = Math.min(a, b);
}

/**
 * Levenshtein distance, giving up as soon as it is certain to exceed `max`.
 *
 * Returns `max + 1` rather than the real distance once it bails - callers only
 * ever ask "is this within the threshold".
 */
function getBoundedDistance(a: string, b: string, max: number): number {
  // A length gap alone already costs that many insertions.
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let previous = new Int32Array(b.length + 1);
  let current = new Int32Array(b.length + 1);

  for (let j = 0; j <= b.length; j++) {
    previous[j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    let rowMin = i;

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        (previous[j - 1] ?? 0) + cost, // substitution
        (previous[j] ?? 0) + 1, // deletion
        (current[j - 1] ?? 0) + 1, // insertion
      );

      current[j] = value;
      if (value < rowMin) rowMin = value;
    }

    // No later row can dip below this row's minimum, so once the whole row is
    // past the cutoff the answer can only grow.
    if (rowMin > max) return max + 1;

    [previous, current] = [current, previous];
  }

  return previous[b.length] ?? max + 1;
}
