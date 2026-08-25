import { type BN } from '@polkadot/util';

import { type Asset } from '@/shared/core';
import { formatAsset } from '@/shared/lib/utils';
import { type TransactionValidationRuleError } from '@/shared/ui-entities';

/**
 * Whether the bond is too small for the nomination that follows it.
 *
 * `staking.nominate` rejects a stash bonded below `MinNominatorBond` outright,
 * and bond + nominate travel as one `BATCH_ALL` — so a bond under the minimum
 * does not create a smaller position, it fails the whole transaction after the
 * user has paid to find out. Exactly the minimum is legal.
 *
 * A zero minimum means the chain has not answered yet; nothing is below an
 * unknown floor.
 */
export function isBelowMinimumBond({ amount, minimumBond }: { amount: BN; minimumBond: BN }): boolean {
  if (minimumBond.isZero() || amount.isZero()) return false;

  return amount.lt(minimumBond);
}

export const MINIMUM_BOND_RULE = 'minimum bond';

/**
 * The validator rule behind `isBelowMinimumBond` — blocking, like a balance
 * shortfall.
 */
export function checkMinimumBond(params: {
  amount: BN;
  minimumBond: BN;
  asset: Asset;
}): TransactionValidationRuleError | undefined {
  if (!isBelowMinimumBond(params)) return;

  return {
    rule: MINIMUM_BOND_RULE,
    message: 'staking.belowMinimumBondError',
    values: { minimum: formatAsset(params.minimumBond, params.asset) },
  };
}
