import { type Validator } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

/**
 * The `targets` a `staking.nominate` call carries.
 *
 * The picker returns validator objects in the order the user built the set, and
 * that order is kept: on an oversubscribed election the runtime walks the list
 * from the front, so re-sorting it here would quietly change which nominations
 * count. Duplicates are dropped — the same stash twice is rejected on chain.
 */
export function toNominationTargets(validators: Validator[]): AccountId[] {
  const seen = new Set<AccountId>();
  const targets: AccountId[] = [];

  for (const validator of validators) {
    if (seen.has(validator.accountId)) continue;

    seen.add(validator.accountId);
    targets.push(validator.accountId);
  }

  return targets;
}
