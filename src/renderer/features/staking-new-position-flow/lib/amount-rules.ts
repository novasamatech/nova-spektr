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
