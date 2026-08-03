import { performSearch } from '@/shared/lib/utils';
import { type EraValidator } from '@/domains/staking';

import { type DisplayedStrings } from './types';

/**
 * Filters the table by what the user typed.
 *
 * Two rules, both deliberate:
 *
 * - **Only rendered strings are matched** - the resolved identity name and the
 *   address as this chain displays it. The stored hex account id is never on
 *   screen, so matching it would surface rows the query does not visibly
 *   explain.
 * - **The incoming order survives.** The list is already ordered by the column
 *   the user chose to sort by; re-ranking it by match weight would silently
 *   override that choice mid-typing.
 */
export function searchValidators(
  validators: EraValidator[],
  query: string,
  displayed: DisplayedStrings,
): EraValidator[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) return validators;

  const matched = performSearch({
    records: validators,
    query: trimmed,
    // Deliberately not `getDisplayedLabel`: its account-id fallback is a label of
    // last resort for sorting, and matching it here would make the hex account id
    // searchable through the back door.
    getMeta: (validator) => ({
      displayedName: displayed.names[validator.accountId] ?? '',
      displayedAddress: displayed.addresses[validator.accountId] ?? '',
    }),
    weights: { displayedName: 1, displayedAddress: 0.5 },
  });

  if (matched.length === validators.length) return validators;

  const positions = new Map(validators.map((validator, index) => [validator, index]));

  return matched.toSorted((left, right) => (positions.get(left) ?? 0) - (positions.get(right) ?? 0));
}
