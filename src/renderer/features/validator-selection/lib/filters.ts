import { BN } from '@polkadot/util';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type EraValidator, type IdentityParentMap } from '@/domains/staking';

import { DEFAULT_FILTERS } from './constants';
import { type FiltersState } from './types';

const EMPTY_PARENTS: IdentityParentMap = {};

/**
 * Whether the validator carries an on-chain identity.
 *
 * The cluster map is the identity signal the whole staking surface already
 * agrees on: a validator only gets a cluster key once its identity display name
 * is known, so "no cluster" and "no identity" are the same statement.
 */
export function hasOnChainIdentity(accountId: AccountId, identityParents: IdentityParentMap): boolean {
  return (identityParents[accountId] ?? null) !== null;
}

/**
 * Narrows the browsable table. Every bound is inclusive, so typing the exact
 * value of a validator keeps it in the list rather than dropping it on a
 * rounding edge.
 *
 * A validator whose APY the chain never reported cannot satisfy a minimum APY
 * and is dropped by that bound - but an unknown block count is _not_ read as
 * idle, so "hide idle" only removes validators actually observed authoring
 * nothing.
 */
export function applyFilters(
  validators: EraValidator[],
  filters: FiltersState,
  identityParents: IdentityParentMap = EMPTY_PARENTS,
): EraValidator[] {
  const minOwnStake = filters.minOwnStake === null ? null : parseStake(filters.minOwnStake);

  // Identities load after the elected set does, so an empty map means "not known
  // yet", not "nobody has one". Applying the identity bound against it would
  // filter every row out and show "no validators match your filters" for a list
  // that is merely still resolving.
  const identitiesKnown = Object.keys(identityParents).length > 0;

  return validators.filter((validator) => {
    if (filters.minApy !== null && (validator.apy === null || validator.apy < filters.minApy)) return false;
    if (filters.maxCommission !== null && validator.commission > filters.maxCommission) return false;
    if (minOwnStake !== null && parseStake(validator.ownStake).lt(minOwnStake)) return false;
    if (filters.hideOversubscribed && validator.oversubscribed) return false;
    if (filters.hideIdle && validator.blocksAuthored === 0) return false;
    if (filters.hasIdentity && identitiesKnown && !hasOnChainIdentity(validator.accountId, identityParents)) {
      return false;
    }
    if (filters.neverSlashed && validator.slashed) return false;

    return true;
  });
}

/**
 * Drives the "changed from default" dot on the filter button - the only hint
 * the user gets that a collapsed popover is still narrowing the list.
 */
export function filtersDiffer(filters: FiltersState): boolean {
  return (
    filters.minApy !== DEFAULT_FILTERS.minApy ||
    filters.maxCommission !== DEFAULT_FILTERS.maxCommission ||
    filters.minOwnStake !== DEFAULT_FILTERS.minOwnStake ||
    filters.hideOversubscribed !== DEFAULT_FILTERS.hideOversubscribed ||
    filters.hideIdle !== DEFAULT_FILTERS.hideIdle ||
    filters.hasIdentity !== DEFAULT_FILTERS.hasIdentity ||
    filters.neverSlashed !== DEFAULT_FILTERS.neverSlashed
  );
}

function parseStake(value: string): BN {
  try {
    return new BN(value);
  } catch {
    return new BN(0);
  }
}
