import { type EraIndex } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

/**
 * Canonical key for anything addressed by an (era, validator) exposure pair:
 * commission lookups, claimed-page sets, indexer aggregation buckets.
 *
 * Shared by `payouts` and `era-rewards` on purpose — both modules build maps on
 * one side of the flow and read them on the other, so the two must agree on the
 * exact string. Diverging formats would not fail loudly: lookups would simply
 * miss and silently fall back to defaults (zero commission, "nothing
 * claimed").
 *
 * Domain-internal — not part of the staking public API.
 */
export function exposureKey(era: EraIndex, validator: AccountId): string {
  return `${era}-${validator}`;
}
