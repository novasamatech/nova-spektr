import { type FiltersState, type SortState } from './types';

/**
 * "Has on-chain identity" and "never slashed" start on: an anonymous or slashed
 * validator is rarely what someone browsing the list wants, and both switches
 * are visible in the popover, so the narrowing is never silent.
 */
export const DEFAULT_FILTERS: FiltersState = {
  minApy: null,
  maxCommission: null,
  minOwnStake: null,
  hideOversubscribed: false,
  hideIdle: false,
  hasIdentity: true,
  neverSlashed: true,
};

/** Best paying first - the order the recommendation itself is built in. */
export const DEFAULT_SORT: SortState = {
  column: 'apy',
  direction: 'desc',
};
