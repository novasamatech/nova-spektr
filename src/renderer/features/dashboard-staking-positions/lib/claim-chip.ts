import { BN } from '@polkadot/util';

/** What the payout scan of one position has to say - see `useUnclaimedRewards`. */
type UnclaimedScan = {
  /** Unclaimed total in planck, `'0'` while unknown. */
  total: string;
  pending: boolean;
  /** The scan looked everywhere; only then is a `'0'` "nothing to claim". */
  complete: boolean;
};

const SCANNING_KEY = 'dashboard.staking.positions.detail.actions.scanningPayouts';
const NOTHING_TO_CLAIM_KEY = 'dashboard.staking.positions.detail.actions.nothingToClaim';
const UNKNOWN_KEY = 'dashboard.staking.positions.unclaimedUnknown';

/**
 * Why the Claim chip has nothing to claim, `null` when it has.
 *
 * The chip is only live when the scan has actually found a payout: the claim
 * request it fires is built from those payouts, and with none to build from it
 * is silently dropped - a chip that is clickable but does nothing. A scan still
 * running, or one that could not look everywhere and found nothing, therefore
 * disables the chip with a hint that says so, rather than asserting "nothing to
 * claim" about payouts nobody has checked. An incomplete scan that did find
 * payouts keeps the chip: claiming what is known is a valid claim.
 */
export function getClaimBlockedReasonKey({ total, pending, complete }: UnclaimedScan): string | null {
  if (pending) return SCANNING_KEY;
  if (!new BN(total).isZero()) return null;

  return complete ? NOTHING_TO_CLAIM_KEY : UNKNOWN_KEY;
}
