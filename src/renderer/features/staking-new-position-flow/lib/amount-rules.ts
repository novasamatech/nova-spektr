import { type BN, BN_ZERO } from '@polkadot/util';

/**
 * Everything the account can put behind a bond: its reservable balance less the
 * fee. Never negative — a fee larger than the balance means nothing to bond,
 * not a negative maximum.
 */
export function getAvailableToBond({ reservable, fee }: { reservable: BN; fee: BN | null }): BN {
  const available = fee ? reservable.sub(fee) : reservable;

  return available.isNeg() ? BN_ZERO : available;
}

/**
 * Whether the bond is too small for the nomination that follows it.
 *
 * This blocks the flow rather than warning it, which is the opposite of what
 * unbonding does with the same figure. The reason is the call, not the policy:
 * `staking.nominate` rejects a stash bonded below `MinNominatorBond` outright,
 * and the two calls travel as one `BATCH_ALL` — so a bond under the minimum
 * does not create a smaller position, it fails the whole transaction after the
 * user has paid to find out.
 *
 * A zero minimum means the chain has not answered yet; nothing is below an
 * unknown floor.
 */
export function isBelowMinimumBond({ amount, minimumBond }: { amount: BN; minimumBond: BN }): boolean {
  if (minimumBond.isZero() || amount.isZero()) return false;

  return amount.lt(minimumBond);
}
