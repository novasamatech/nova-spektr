import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type EraValidatorMap, type ExposureMap } from '@/domains/staking';

import { type NominationCounts, type NominationRow, type NominationStatus } from './types';

type NominationInput = {
  /** The position's stash — whose slice of each exposure page is "ours". */
  stash: AccountId;
  /** Everything the stash nominates. */
  nominations: AccountId[];
  /** Nominated validators whose active-era exposure includes the stash. */
  activeValidators: AccountId[];
  /**
   * Elected validators of the active era. `null` while the set is unknown — no
   * nomination is then called `droppedOut`, because nothing proves it was.
   */
  eraValidators: EraValidatorMap | null;
  /** Active-era exposure pages of the nominated validators. */
  exposures: ExposureMap;
};

/**
 * Why a nomination earns nothing is two different facts, and the era validator
 * set is what separates them: a validator missing from it was simply not
 * elected (`waiting`), while one that is elected but does not carry our stake
 * dropped us out of its rewarded page.
 */
function resolveStatus(
  accountId: AccountId,
  active: Set<AccountId>,
  eraValidators: EraValidatorMap | null,
): NominationStatus {
  if (active.has(accountId)) return 'active';
  if (eraValidators === null) return 'waiting';

  return accountId in eraValidators ? 'droppedOut' : 'waiting';
}

export function buildNominationRows({
  stash,
  nominations,
  activeValidators,
  eraValidators,
  exposures,
}: NominationInput): NominationRow[] {
  const active = new Set(activeValidators);

  return nominations.map((accountId) => {
    const validator = eraValidators?.[accountId] ?? null;
    const ourSlice = exposures[accountId]?.others.find((individual) => individual.who === stash);

    return {
      accountId,
      status: resolveStatus(accountId, active, eraValidators),
      ourStake: ourSlice?.value ?? null,
      commission: validator?.commission ?? null,
      apy: validator?.apy ?? null,
      eraPoints: validator?.eraPoints ?? null,
    };
  });
}

/** Footer counts of the nominations table. */
export function countNominations(rows: NominationRow[]): NominationCounts {
  const counts: NominationCounts = { total: rows.length, active: 0, waiting: 0, droppedOut: 0 };

  for (const row of rows) {
    if (row.status === 'active') counts.active += 1;
    else if (row.status === 'waiting') counts.waiting += 1;
    else counts.droppedOut += 1;
  }

  return counts;
}
