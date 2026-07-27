import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type EraValidator, type IdentityParentMap, MAX_PER_CLUSTER } from '@/domains/staking';

import { type ValidatorFlag } from './types';

/**
 * The single badge a row carries, most severe first.
 *
 * `blocked` outranks everything because it is the only flag that makes the row
 * unselectable; a slash is the strongest reason not to pick a selectable one;
 * being oversubscribed costs rewards outright; a third validator of an operator
 * the user already picked twice weakens their spread; and "no identity" is the
 * mildest - it says only that we cannot name who runs it.
 *
 * @param clusterPosition 1-based position of the validator inside its operator
 *   cluster, or `undefined` when it has none - which is exactly the case of a
 *   validator with no on-chain identity.
 */
export function getValidatorFlag(validator: EraValidator, clusterPosition?: number): ValidatorFlag | null {
  if (validator.blocked) return 'blocked';
  if (validator.slashed) return 'slashed';
  if (validator.oversubscribed) return 'oversubscribed';

  if (clusterPosition === undefined || clusterPosition <= 0) return 'noIdentity';
  if (clusterPosition > MAX_PER_CLUSTER) return 'cluster';

  return null;
}

/**
 * Numbers each validator inside its operator cluster, walking the given order.
 *
 * Callers pass the recommendation order (APY descending) rather than the user's
 * current sort: "3rd in cluster" means "the third best validator of this
 * operator", the same third one the recommendation drops. Renumbering it every
 * time the user clicks a column header would make the badge say something
 * different on every sort.
 *
 * Validators with no cluster key get no entry - they are not an operator group
 * of one, they are simply unidentified.
 */
export function getClusterPositions(
  sortedValidators: EraValidator[],
  identityParents: IdentityParentMap,
): Record<AccountId, number> {
  const usedByCluster = new Map<AccountId, number>();
  const positions: Record<AccountId, number> = {};

  for (const validator of sortedValidators) {
    const cluster = identityParents[validator.accountId] ?? null;
    if (cluster === null) continue;

    const position = (usedByCluster.get(cluster) ?? 0) + 1;
    usedByCluster.set(cluster, position);
    positions[validator.accountId] = position;
  }

  return positions;
}
