import { BN } from '@polkadot/util';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type EraValidator } from '@/domains/staking';

import { type DisplayedStrings, type ScoreMap, type SortDirection, type SortState } from './types';

const EMPTY_DISPLAY: DisplayedStrings = { names: {}, addresses: {} };
const EMPTY_SCORES: ScoreMap = {};

/**
 * What the "Validator" column shows: the resolved on-chain identity, falling
 * back to the address as it is rendered for this chain, and finally to the raw
 * account id so a row is never labelled with an empty string.
 */
export function getDisplayedLabel(accountId: AccountId, displayed: DisplayedStrings = EMPTY_DISPLAY): string {
  const name = displayed.names[accountId];
  if (name && name.length > 0) return name;

  const address = displayed.addresses[accountId];
  if (address && address.length > 0) return address;

  return accountId;
}

/**
 * Orders the table by the active column.
 *
 * Two rules hold for every column:
 *
 * - **Unknown values sort last in both directions.** A `null` APY or block count
 *   means the chain reported nothing, not "zero" - flipping the arrow must not
 *   promote validators we know nothing about to the top.
 * - **Ties keep the incoming order**, pinned by an explicit index tiebreak rather
 *   than by engine sort stability, so the table never reshuffles under an
 *   unrelated re-render.
 */
export function sortValidators(
  validators: EraValidator[],
  sort: SortState,
  displayed: DisplayedStrings = EMPTY_DISPLAY,
  scores: ScoreMap = EMPTY_SCORES,
): EraValidator[] {
  const compare = getComparator(sort, displayed, scores);

  return validators
    .map((validator, index) => ({ validator, index }))
    .sort((a, b) => compare(a.validator, b.validator) || a.index - b.index)
    .map((entry) => entry.validator);
}

function getComparator(
  sort: SortState,
  displayed: DisplayedStrings,
  scores: ScoreMap,
): (left: EraValidator, right: EraValidator) => number {
  const { column, direction } = sort;

  switch (column) {
    case 'validator':
      return (left, right) =>
        applyDirection(
          compareLabel(getDisplayedLabel(left.accountId, displayed), getDisplayedLabel(right.accountId, displayed)),
          direction,
        );
    case 'eraPoints':
      return (left, right) => applyDirection(left.eraPoints - right.eraPoints, direction);
    case 'nominators':
      return (left, right) => applyDirection(left.nominatorCount - right.nominatorCount, direction);
    case 'ownStake':
      return (left, right) => applyDirection(compareStake(left.ownStake, right.ownStake), direction);
    case 'commission':
      return (left, right) => applyDirection(left.commission - right.commission, direction);
    case 'apy':
      return (left, right) => compareNullableNumber(left.apy, right.apy, direction);
    case 'score':
      // A validator outside the scored set sorts as 0 rather than as unknown:
      // the set the scores are built from is the same elected set the table
      // shows, so an absent entry means "not elected", not "not measured".
      return (left, right) =>
        applyDirection((scores[left.accountId]?.overall ?? 0) - (scores[right.accountId]?.overall ?? 0), direction);
  }
}

function applyDirection(comparison: number, direction: SortDirection): number {
  return direction === 'asc' ? comparison : -comparison;
}

/**
 * `null` is "the chain told us nothing", which is not a value that can be
 * ranked - those rows go to the bottom whichever way the arrow points.
 */
function compareNullableNumber(left: number | null, right: number | null, direction: SortDirection): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;

  return applyDirection(left - right, direction);
}

/**
 * Stakes are planck strings well past `Number.MAX_SAFE_INTEGER` - compare with
 * BN.
 */
function compareStake(left: string, right: string): number {
  return parseStake(left).cmp(parseStake(right));
}

function parseStake(value: string): BN {
  try {
    return new BN(value);
  } catch {
    return new BN(0);
  }
}

function compareLabel(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true });
}
