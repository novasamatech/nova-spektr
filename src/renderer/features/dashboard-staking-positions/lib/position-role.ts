import { type StakingPosition } from '@/domains/staking';

/**
 * What the stash does with its bond, as the table's Type column says it.
 *
 * - `validator` — registered as a validator (elected, or elected-and-chilled);
 * - `nominator` — nominates somebody;
 * - `idle` — bonded and doing neither;
 * - `unknown` — the era validator set has not been read, so an idle-looking
 *   ledger cannot yet be told from a validating one.
 *
 * This is a view concern rather than a domain one: the domain answers the two
 * questions the chain actually has facts about — `kind` (validator or
 * nominator) and `status` (what that bond is doing this era) — and the column
 * folds them into the one word a user scans for. `unknown` is the same
 * anti-flicker rule the status pill follows: it says the app has not looked,
 * never that the chain said "nothing".
 */
export type PositionRole = 'validator' | 'nominator' | 'idle' | 'unknown';

export function derivePositionRole(position: StakingPosition): PositionRole {
  if (position.kind === 'validator') return 'validator';
  if (position.nominations.length > 0) return 'nominator';

  return position.status === 'unknown' ? 'unknown' : 'idle';
}
